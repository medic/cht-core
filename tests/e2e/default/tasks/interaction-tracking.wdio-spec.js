const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');
const modalPage = require('@page-objects/default/common/modal.wdio.page');
/* global window */
const { CONTACT_TYPES } = require('@medic/constants');
const path = require('path');
const chtConfUtils = require('@utils/cht-conf');

const INTERACTION_DOC_PREFIX = 'interaction-';

const FAKE_YESTERDAY_MS = Date.UTC(2025, 0, 15, 12, 0, 0); // 2025-01-15 12:00 UTC
const FAKE_YESTERDAY_DATE = '2025-1-15';                   // service's `YYYY-M-D` format

// `timestamp` and `startedAt` are excluded because `Date.now()` is monotonic
// (see `installFakeDate`); their exact values change between calls but their
// chronological order is what matters and is enforced by the service's
// sort-by-timestamp in `groupBySession`.
const NON_DETERMINISTIC_FIELDS = ['_id', '_rev', 'deviceId', 'version', 'timestamp', 'startedAt'];

// Date-only init script. We deliberately avoid `browser.emulate('clock')`,
// which injects `@sinonjs/fake-timers` into the page:
//   1. The vendored bundle calls `_global.process && require('util').promisify`
//      unguarded. webpack's `process` polyfill makes `_global.process` truthy
//      in the browser, but `require` is undefined → `ReferenceError`.
//   2. It overrides `setTimeout`/`setInterval` globally. zone.js wraps the
//      originals, so installed timers become "cancelled actions" the next
//      time the scheduler flushes — the page floods with RxJS
//      "Error: executing a cancelled action".
// Stubbing only `Date` sidesteps both. Init scripts run before any document
// script on every navigation, so the stub is in place by the time the app
// bootstraps and `interactionTrackingService.init()` runs.
//
// `tick` makes `Date.now()` strictly monotonic. With a fully frozen clock,
// every recorded event gets the same timestamp; the service's stable
// sort-by-timestamp then leaves events in PouchDB's random uuid-v7 order,
// hiding any chronological-ordering regression. A tiny per-call increment
// preserves the fake-day semantics (1ms per call won't roll the day) and
// restores the invariant that earlier `record()` calls have lower timestamps.
//
// `FakeDate.prototype = RealDate.prototype` keeps `instanceof Date` working
// for instances we return from the zero-arg constructor (which are real
// `RealDate` objects). Side effect: this rewrites
// `Date.prototype.constructor = FakeDate` globally; libraries that clone a
// date with `new x.constructor()` (no args) would get a fresh fake-now, not
// a clone — moment/date-fns don't do that, so we accept the trade-off rather
// than break `instanceof`.
const installFakeDate = (ms) => browser.addInitScript((fakeMs) => {
  const RealDate = Date;
  let tick = 0;
  // eslint-disable-next-line func-style
  function FakeDate(...args) {
    if (!(this instanceof FakeDate)) {
      return RealDate(...args);
    }
    return args.length === 0 ? new RealDate(fakeMs + tick++) : new RealDate(...args);
  }
  FakeDate.prototype = RealDate.prototype;
  FakeDate.prototype.constructor = FakeDate;
  FakeDate.now = () => fakeMs + tick++;
  FakeDate.UTC = RealDate.UTC;
  FakeDate.parse = RealDate.parse;
  window.Date = FakeDate;
}, ms);

let clockScript;

// Register the init script. Callers must trigger a full document load
// (login or refresh) so the script runs before the app bootstraps.
const installClockYesterday = async () => {
  clockScript = await installFakeDate(FAKE_YESTERDAY_MS);
};

const advanceFakeClock = async (msFromYesterday) => {
  await clockScript.remove();
  clockScript = await installFakeDate(FAKE_YESTERDAY_MS + msFromYesterday);
  await commonPage.refresh();
  // The fake clock is always wrong vs. the server, so checkDateService always
  // raises the modal on a full reload. No need to guard.
  await modalPage.submit();
};

const restoreClockAndRefresh = async () => {
  if (clockScript) {
    await clockScript.remove();
    clockScript = undefined;
  }
  await commonPage.refresh();
  await commonPage.waitForPageLoaded();
};

/**
 * Drive the visibilitychange handler so the buffer flushes to the per-day DB
 */
const triggerVisibilityChange = async () => {
  await browser.execute(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await browser.execute(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });
};

const getInteractionMetaDocs = () => browser.execute(async () => {
  const metaDb = window.CHTCore.DB.get({ meta: true });
  const response = await metaDb.allDocs({
    include_docs: true,
    startkey: 'interaction-',
    endkey: 'interaction-\ufff0',
  });
  return response.rows.map(row => row.doc);
});

const getInteractionMetaDocsFromServer = async ({ username }) => {
  const metaDocs = await utils.requestOnTestMetaDb({
    userName: username,
    path: '/_all_docs',
    qs: {
      include_docs: true,
      startkey: INTERACTION_DOC_PREFIX,
      endkey: `${INTERACTION_DOC_PREFIX}\ufff0`,
    },
  });
  return metaDocs.rows.map(({ doc }) => doc);
};

/**
 * Wait for init()'s aggregation to surface the aggregate in the local meta DB.
 */
const waitForAggregateDoc = async (username, timeout = 10000) => {
  let aggregate;
  await browser.waitUntil(async () => {
    const docs = await getInteractionMetaDocs();
    aggregate = docs.find(d => d.type === 'interaction-log' && d.metadata?.user === username);
    return !!aggregate;
  }, { timeout, interval: 200, timeoutMsg: 'Aggregate doc never appeared in meta DB' });
  return aggregate;
};

const todayDbExistsForUser = async (username) => browser.execute(async (un) => {
  const dbs = (await window.indexedDB.databases()) || [];
  return dbs.some(d => d.name?.startsWith('_pouch_interaction-') && d.name.endsWith(`-${un}`));
}, username);

// Submitted home_visits mark the patient's `person_create` task as completed,
// so tests inherit a shrinking list unless we wipe task docs between tests.
// Replication after re-login pulls down the cleared state and the rules engine
// regenerates fresh tasks from the unchanged report history.
const deleteTaskDocs = async () => {
  const result = await utils.requestOnTestDb({ path: '/_all_docs?include_docs=true' });
  const ids = result.rows
    .filter(r => r.doc?.type === 'task')
    .map(r => r.id);
  if (ids.length) {
    await utils.deleteDocs(ids);
  }
};

// Aggregate docs in the user's server meta DB replicate back on every login,
// so without wiping them each test would see the previous test's aggregate
// (first match wins in waitForAggregateDoc).
const deleteServerInteractionDocs = async (username) => {
  try {
    const docs = await getInteractionMetaDocsFromServer({ username });
    if (!docs.length) {
      return;
    }
    await utils.requestOnTestMetaDb({
      userName: username,
      path: '/_bulk_docs',
      method: 'POST',
      body: { docs: docs.map(d => ({ _id: d._id, _rev: d._rev, _deleted: true })) },
    });
  } catch (err) {
    if (err.status === 404) {
      return;
    }
    throw err;
  }

};

const expectAggregateEqual = (actual, expected) => {
  expect(actual).excludingEvery(NON_DETERMINISTIC_FIELDS).to.deep.equal(expected);
};

describe('Interaction Tracking', () => {
  const places = placeFactory.generateHierarchy();
  const clinic = places.get('clinic');
  const healthCenter = places.get(CONTACT_TYPES.HEALTH_CENTER);

  const chwContact = personFactory.build({
    name: 'CHW Interaction',
    phone: '+12068881234',
    place: healthCenter._id,
    parent: healthCenter,
    role: 'chw'
  });

  // Anchor reported_date to fake yesterday so the task config's
  // [reported_date - 3d, reported_date + 7d] window includes FAKE_YESTERDAY_MS.
  const patients = Array.from({ length: 6 }, (_, i) => personFactory.build({
    name: `Patient Interaction ${i + 1}`,
    patient_id: `patient_interaction_${i + 1}`,
    parent: clinic,
    reported_date: FAKE_YESTERDAY_MS,
  }));

  const chw = userFactory.build({
    username: 'offlineuser_interaction',
    isOffline: true,
    place: healthCenter._id,
    contact: chwContact._id,
  });

  const docs = [...places.values(), chwContact, ...patients];

  before(async () => {
    await utils.saveDocs(docs);
    await utils.createUsers([chw]);

    const formsPath = path.join(__dirname, 'forms');
    await chtConfUtils.compileAndUploadAppForms(formsPath);
    await tasksPage.compileTasks('tasks-breadcrumbs-config.js', false);
    await sentinelUtils.waitForSentinel();
  });

  describe('when can_track_task_interactions permission is denied', () => {
    beforeEach(async () => {
      await deleteTaskDocs();
      await deleteServerInteractionDocs(chw.username);
      await installClockYesterday();
      await loginPage.login(chw);
      await modalPage.submit();
      await commonPage.goToTasks();
      await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
    });

    afterEach(async () => {
      await commonPage.reloadSession();
    });

    it('does not create a per-day DB or write any meta doc', async () => {
      await tasksPage.openTaskByIndex(0);
      await triggerVisibilityChange();

      expect(await todayDbExistsForUser(chw.username)).to.equal(false);
      expect(await getInteractionMetaDocs()).to.deep.equal([]);
    });
  });

  describe('when can_track_task_interactions is enabled and task_group is enabled', () => {
    before(async () => {
      await utils.updatePermissions(
        ['chw'],
        ['can_track_task_interactions', 'can_view_tasks_group'],
        [],
        { ignoreReload: true }
      );
    });

    beforeEach(async () => {
      await deleteTaskDocs();
      await deleteServerInteractionDocs(chw.username);
      await installClockYesterday();
      await loginPage.login(chw);
      await modalPage.submit();
      await commonPage.goToTasks();
      await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
    });

    afterEach(async () => {
      await commonPage.reloadSession();
    });

    it('records the full task→submit→group flow into a single-session aggregate', async () => {
      await tasksPage.openTaskByIndex(0);
      await genericForm.submitForm();

      await tasksPage.waitForTasksGroupLoaded();
      const groupTasks = await tasksPage.getTasksInGroup();
      expect(groupTasks.length).to.equal(5);
      await groupTasks[0].click();
      await tasksPage.waitForTaskContentLoaded('Home Visit');
      await genericForm.submitForm();

      await triggerVisibilityChange();
      await restoreClockAndRefresh();

      const aggregate = await waitForAggregateDoc(chw.username);
      expectAggregateEqual(aggregate, {
        type: 'interaction-log',
        sessions: [{
          session: 'tasks',
          startedAt: FAKE_YESTERDAY_MS,
          events: [
            { action: 'task_list:open', timestamp: FAKE_YESTERDAY_MS },
            { action: 'task_list:loaded', timestamp: FAKE_YESTERDAY_MS, detail: '6' },
            { action: 'task:open', timestamp: FAKE_YESTERDAY_MS, ref: 'person_create', detail: '0' },
            { action: 'task:form_open', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task:form_save', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task:complete', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task_group:show', timestamp: FAKE_YESTERDAY_MS, detail: '5' },
            { action: 'task_group:select', timestamp: FAKE_YESTERDAY_MS, ref: 'person_create' },
            { action: 'task_group:leave', timestamp: FAKE_YESTERDAY_MS },
            { action: 'task:open', timestamp: FAKE_YESTERDAY_MS, ref: 'person_create', detail: '0' },
            { action: 'task:form_open', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task:form_save', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task:complete', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task_group:show', timestamp: FAKE_YESTERDAY_MS, detail: '4' },
          ],
        }],
        metadata: {
          user: chw.username,
          date: FAKE_YESTERDAY_DATE,
        },
      });
    });
  });

  describe('when can_track_task_interactions is enabled and task_group is disabled', () => {
    before(async () => {
      await utils.updatePermissions(
        ['chw'],
        ['can_track_task_interactions'],
        ['can_view_tasks_group'], // inconsistent task sorting can make tests flaky
        { ignoreReload: true }
      );
    });

    beforeEach(async () => {
      await deleteTaskDocs();
      await deleteServerInteractionDocs(chw.username);
      await installClockYesterday();
      await loginPage.login(chw);
      await modalPage.submit();
      await commonPage.goToTasks();
      await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
    });

    afterEach(async () => {
      await commonPage.reloadSession();
    });

    it('records a single-session\'s worth of events with the right shape', async () => {
      await tasksPage.scrollTaskList();
      await tasksPage.openTaskByIndex(0);
      await genericForm.submitForm();
      await commonPage.waitForPageLoaded();
      await tasksPage.openTaskByIndex(1);

      // Navigating away ends the session and drains the buffer.
      await commonPage.goToMessages();
      await restoreClockAndRefresh();

      const aggregate = await waitForAggregateDoc(chw.username);
      expectAggregateEqual(aggregate, {
        type: 'interaction-log',
        sessions: [{
          session: 'tasks',
          startedAt: FAKE_YESTERDAY_MS,
          events: [
            { action: 'task_list:open', timestamp: FAKE_YESTERDAY_MS },
            { action: 'task_list:loaded', timestamp: FAKE_YESTERDAY_MS, detail: '4' },
            { action: 'task_list:scroll', timestamp: FAKE_YESTERDAY_MS },
            { action: 'task:open', timestamp: FAKE_YESTERDAY_MS, ref: 'person_create', detail: '0' },
            { action: 'task:form_open', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task:form_save', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task:complete', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task:open', timestamp: FAKE_YESTERDAY_MS, ref: 'person_create', detail: '1' },
            { action: 'task:form_open', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task_list:leave', timestamp: FAKE_YESTERDAY_MS },
          ],
        }],
        metadata: {
          user: chw.username,
          date: FAKE_YESTERDAY_DATE,
        },
      });
    });

    it('flushes events when navigating away from /tasks', async () => {
      await tasksPage.openTaskByIndex(0);
      await commonPage.goToReports();
      await restoreClockAndRefresh();

      const aggregate = await waitForAggregateDoc(chw.username);
      expectAggregateEqual(aggregate, {
        type: 'interaction-log',
        sessions: [{
          session: 'tasks',
          startedAt: FAKE_YESTERDAY_MS,
          events: [
            { action: 'task_list:open', timestamp: FAKE_YESTERDAY_MS },
            { action: 'task_list:loaded', timestamp: FAKE_YESTERDAY_MS, detail: '3' },
            { action: 'task:open', timestamp: FAKE_YESTERDAY_MS, ref: 'person_create', detail: '0' },
            { action: 'task:form_open', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task_list:leave', timestamp: FAKE_YESTERDAY_MS },
          ],
        }],
        metadata: {
          user: chw.username,
          date: FAKE_YESTERDAY_DATE,
        },
      });
    });

    it('preserves session boundaries across multiple visits to the tasks tab', async () => {
      // Session 1 at FAKE_YESTERDAY_MS
      await tasksPage.openTaskByIndex(0);
      await commonPage.goToReports();

      // Advance the fake clock so session 2 has a distinct sessionStartedAt.
      const SESSION_GAP_MS = 60 * 1000;
      await advanceFakeClock(SESSION_GAP_MS);

      // Session 2 at FAKE_YESTERDAY_MS + 60_000
      await commonPage.goToTasks();
      await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
      await tasksPage.scrollTaskList();
      await tasksPage.openTaskByIndex(1);
      await commonPage.goToMessages();

      await restoreClockAndRefresh();

      const aggregate = await waitForAggregateDoc(chw.username);
      const T1 = FAKE_YESTERDAY_MS;
      const T2 = FAKE_YESTERDAY_MS + SESSION_GAP_MS;
      expectAggregateEqual(aggregate, {
        type: 'interaction-log',
        sessions: [
          {
            session: 'tasks',
            startedAt: T1,
            events: [
              { action: 'task_list:open', timestamp: T1 },
              { action: 'task_list:loaded', timestamp: T1, detail: '3' },
              { action: 'task:open', timestamp: T1, ref: 'person_create', detail: '0' },
              { action: 'task:form_open', timestamp: T1, ref: 'home_visit' },
              { action: 'task_list:leave', timestamp: T1 },
            ],
          },
          {
            session: 'tasks',
            startedAt: T2,
            events: [
              { action: 'task_list:open', timestamp: T2 },
              { action: 'task_list:loaded', timestamp: T2, detail: '3' },
              { action: 'task_list:scroll', timestamp: T2 },
              { action: 'task:open', timestamp: T2, ref: 'person_create', detail: '1' },
              { action: 'task:form_open', timestamp: T2, ref: 'home_visit' },
              { action: 'task_list:leave', timestamp: T2 },
            ],
          },
        ],
        metadata: {
          user: chw.username,
          date: FAKE_YESTERDAY_DATE,
        },
      });
    });

    it('flushes events when the browser tab becomes hidden', async () => {
      await tasksPage.scrollTaskList();
      await tasksPage.openTaskByIndex(2);
      await triggerVisibilityChange();
      await restoreClockAndRefresh();

      const aggregate = await waitForAggregateDoc(chw.username);
      expectAggregateEqual(aggregate, {
        type: 'interaction-log',
        sessions: [{
          session: 'tasks',
          startedAt: FAKE_YESTERDAY_MS,
          events: [
            { action: 'task_list:open', timestamp: FAKE_YESTERDAY_MS },
            { action: 'task_list:loaded', timestamp: FAKE_YESTERDAY_MS, detail: '3' },
            { action: 'task_list:scroll', timestamp: FAKE_YESTERDAY_MS },
            { action: 'task:open', timestamp: FAKE_YESTERDAY_MS, ref: 'person_create', detail: '2' },
            { action: 'task:form_open', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
          ],
        }],
        metadata: {
          user: chw.username,
          date: FAKE_YESTERDAY_DATE,
        },
      });
    });

    it('replicates the aggregate doc to the server\'s users-meta DB on sync', async () => {
      await tasksPage.openTaskByIndex(0);
      await commonPage.goToReports();
      await restoreClockAndRefresh();

      // Wait for the aggregate to land locally before we attempt to sync.
      await waitForAggregateDoc(chw.username);
      await commonPage.sync();
      await sentinelUtils.waitForSentinel();

      const serverDocs = await getInteractionMetaDocsFromServer({ username: chw.username });
      const aggregate = serverDocs.find(d => d.type === 'interaction-log');
      expectAggregateEqual(aggregate, {
        type: 'interaction-log',
        sessions: [{
          session: 'tasks',
          startedAt: FAKE_YESTERDAY_MS,
          events: [
            { action: 'task_list:open', timestamp: FAKE_YESTERDAY_MS },
            { action: 'task_list:loaded', timestamp: FAKE_YESTERDAY_MS, detail: '3' },
            { action: 'task:open', timestamp: FAKE_YESTERDAY_MS, ref: 'person_create', detail: '0' },
            { action: 'task:form_open', timestamp: FAKE_YESTERDAY_MS, ref: 'home_visit' },
            { action: 'task_list:leave', timestamp: FAKE_YESTERDAY_MS },
          ],
        }],
        metadata: {
          user: chw.username,
          date: FAKE_YESTERDAY_DATE,
        },
      });
    });
  });
});
