const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');
const placeFactory = require('@factories/cht/contacts/place');
const personFactory = require('@factories/cht/contacts/person');
const tasksPage = require('@page-objects/default/tasks/tasks.wdio.page');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');
const sentinelUtils = require('@utils/sentinel');
const commonPage = require('@page-objects/default/common/common.wdio.page');
/* global window */
const { CONTACT_TYPES } = require('@medic/constants');
const path = require('path');
const moment = require('moment');
const chtConfUtils = require('@utils/cht-conf');

const INTERACTION_DOC_PREFIX = 'interaction-';

const getInteractionDocsFromMetaDb = async ({ username, password }) => {
  const options = { auth: { username, password }, userName: username };
  const qs = {
    include_docs: true,
    startkey: INTERACTION_DOC_PREFIX,
    endkey: `${INTERACTION_DOC_PREFIX}\ufff0`,
  };
  const metaDocs = await utils.requestOnTestMetaDb({
    ...options,
    path: '/_all_docs',
    qs,
  });
  return metaDocs.rows.map(({ doc }) => doc);
};

const clearInteractionDocsFromMetaDb = async ({ username, password }) => {
  const docs = await getInteractionDocsFromMetaDb({ username, password });
  docs.forEach(doc => doc._deleted = true);
  const options = { auth: { username, password }, userName: username };
  await utils.requestOnTestMetaDb({ ...options, path: '/_bulk_docs', method: 'POST', body: { docs } });
};

const getInteractionDocFromBrowser = async (expectedCount = 1) => {
  await browser.pause(100);
  const result = await browser.execute(async (INTERACTION_DOC_PREFIX) => {
    const metaDb = window.CHTCore.DB.get({ meta: true });
    return await metaDb.allDocs({
      include_docs: true,
      startkey: INTERACTION_DOC_PREFIX,
      endkey: `${INTERACTION_DOC_PREFIX}\ufff0`
    });
  }, INTERACTION_DOC_PREFIX);

  expect(result.rows.length).to.equal(
    expectedCount,
    `different than ${expectedCount} interaction docs found in the browser meta db`
  );
  return result.rows[0]?.doc;
};

const triggerVisibilityChange = async () => {
  await browser.execute(() => {
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await browser.pause(1000);
  await browser.execute(() => {
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });
  await browser.pause(1000);
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

  const patients = Array.from({ length: 6 }, (_, i) => personFactory.build({
    name: `Patient Interaction ${i + 1}`,
    patient_id: `patient_interaction_${i + 1}`,
    parent: clinic,
    reported_date: Date.now(),
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

  describe('when can_track_task_interactions permission is disabled', () => {
    before(async () => {
      await utils.updatePermissions(['chw'], [], ['can_track_task_interactions'], { ignoreReload: true });
      await loginPage.login(chw);
    });

    beforeEach(async () => {
      await commonPage.goToTasks();
      await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
    });

    after(async () => {
      await triggerVisibilityChange();
      await commonPage.reloadSession();
      await clearInteractionDocsFromMetaDb(chw);
    });

    it('should not record interaction logs when permission is denied', async () => {
      await tasksPage.openTaskByIndex(0);

      await triggerVisibilityChange();

      const interactionDoc = await getInteractionDocFromBrowser(0);
      expect(interactionDoc).to.not.exist;
    });
  });

  describe('when task_group permission is enabled', () => {
    before(async () => {
      await utils.updatePermissions(
        ['chw'],
        ['can_track_task_interactions', 'can_view_tasks_group'],
        [],
        { ignoreReload: true }
      );
      await loginPage.login(chw);
    });

    beforeEach(async () => {
      await commonPage.goToTasks();
      await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
    });

    after(async () => {
      await triggerVisibilityChange();
      await commonPage.reloadSession();
      await clearInteractionDocsFromMetaDb(chw);
    });

    it('should record task interactions in order with expected event structure', async () => {
      await tasksPage.openTaskByIndex(0);
      await genericForm.submitForm();

      // tasks group is displayed
      await tasksPage.waitForTasksGroupLoaded();
      const groupTasks = await tasksPage.getTasksInGroup();
      expect(groupTasks.length).to.equal(5);
      await groupTasks[0].click();
      await tasksPage.waitForTaskContentLoaded('Home Visit');
      await genericForm.submitForm();

      await triggerVisibilityChange();
      await commonPage.goToMessages();

      const interactionDoc = await getInteractionDocFromBrowser();
      console.warn(interactionDoc);

      const lastSession = interactionDoc.sessions[interactionDoc.sessions.length - 1];
      console.warn(lastSession.events);
      expect(lastSession.events).excludingEvery('timestamp').to.deep.equal([
        { action: 'task_list:open' },
        { action: 'task_list:loaded', detail: '6' },
        { action: 'task:open', ref: 'person_create', detail: '0' },
        { action: 'task:form_open', ref: 'home_visit' },
        { action: 'task:form_save', ref: 'home_visit' },
        { action: 'task:complete', ref: 'home_visit' },
        { action: 'task_group:show', detail: '5' },
        { action: 'task_group:select', ref: 'person_create' },
        { action: 'task_group:leave' },
        { action: 'task:open', ref: 'person_create', detail: '0' },
        { action: 'task:form_open', ref: 'home_visit' },
        { action: 'task:form_save', ref: 'home_visit' },
        { action: 'task:complete', ref: 'home_visit' },
        { action: 'task_group:show', detail: '4' },
      ]);
    });
  });

  describe('when task_group is disabled', () => {
    before(async () => {
      await utils.updatePermissions(
        ['chw'],
        ['can_track_task_interactions'],
        ['can_view_tasks_group'], // inconsistent task sorting can make tests inconsistent
        { ignoreReload: true }
      );
      await loginPage.login(chw);
    });

    beforeEach(async () => {
      await commonPage.goToTasks();
      await browser.waitUntil(async () => (await tasksPage.getTasks()).length > 0);
    });

    after(async () => {
      await triggerVisibilityChange();
      await commonPage.reloadSession();
      await clearInteractionDocsFromMetaDb(chw);
    });

    it('should record task interactions in order with expected event structure', async () => {
      await tasksPage.scrollTaskList();
      await tasksPage.openTaskByIndex(0);
      await genericForm.submitForm();
      await commonPage.waitForPageLoaded();
      await tasksPage.openTaskByIndex(1);

      await commonPage.goToMessages();

      await commonPage.goToTasks();

      const interactionDoc = await getInteractionDocFromBrowser();

      expect(interactionDoc._id).to.include(
        `${INTERACTION_DOC_PREFIX}${moment().format('YYYY-MM-DD')}-${chw.username}`
      );
      expect(interactionDoc.type).to.equal('interaction-log');

      expect(interactionDoc.metadata.user).to.equal(chw.username);
      expect(interactionDoc.metadata.deviceId).to.be.a('string').and.not.be.empty;
      expect(interactionDoc.metadata.date).to.be.a('string');
      expect(interactionDoc.metadata.versions).to.be.an('array').with.lengthOf.at.least(1);

      // All sessions should be named 'tasks'
      expect(interactionDoc.sessions.length).to.be.greaterThanOrEqual(1);
      interactionDoc.sessions.forEach(session => {
        expect(session.session).to.equal('tasks');
        expect(session.events).to.be.an('array').and.not.be.empty;
      });

      const allEvents = interactionDoc.sessions.flatMap(s => s.events);

      allEvents.forEach(event => {
        expect(event.action).to.be.a('string');
        expect(event.timestamp).to.be.a('number');
      });

      console.warn(allEvents);

      expect(allEvents).excludingEvery('timestamp').to.deep.equal([
        { action: 'task_list:open' },
        { action: 'task_list:loaded', detail: '4' },
        { action: 'task_list:scroll' },
        { action: 'task:open', ref: 'person_create', detail: '0' },
        { action: 'task:form_open', ref: 'home_visit' },
        { action: 'task:form_save', ref: 'home_visit' },
        { action: 'task:complete', ref: 'home_visit' },
        { action: 'task:open', ref: 'person_create', detail: '1' },
        { action: 'task:form_open', ref: 'home_visit' },
        { action: 'task_list:leave' },
      ]);
    });

    it('should flush interaction logs in order when navigating away from tasks', async () => {
      await tasksPage.openTaskByIndex(0);

      // Navigate away from tasks — destroys the tasks component which triggers flush
      await commonPage.goToReports();

      const interactionDoc = await getInteractionDocFromBrowser();

      const lastSession = interactionDoc.sessions[interactionDoc.sessions.length - 1];
      console.warn(lastSession.events);
      expect(lastSession.events).excludingEvery('timestamp').to.deep.equal([
        { action: 'task_list:open' },
        { action: 'task_list:loaded', detail: '3' },
        { action: 'task:open', ref: 'person_create', detail: '0' },
        { action: 'task:form_open', ref: 'home_visit' },
        { action: 'task_list:leave' },
      ]);
    });

    it('should accumulate multiple sessions in order in the same daily document', async () => {
      // Session 1: navigate to tasks, open a task, then leave
      await tasksPage.openTaskByIndex(0);
      await commonPage.goToReports();

      // Session 2: return to tasks, scroll, open a different task, then leave
      await commonPage.goToTasks();

      await tasksPage.scrollTaskList();
      await tasksPage.openTaskByIndex(1);
      await commonPage.goToMessages();

      const interactionDoc = await getInteractionDocFromBrowser();
      const lastTwoSessions = interactionDoc.sessions.slice(-2);

      expect(lastTwoSessions[0].events).excludingEvery('timestamp').to.deep.equal([
        { action: 'task_list:open' },
        { action: 'task_list:loaded', detail: '3' },
        { action: 'task:open', ref: 'person_create', detail: '0' },
        { action: 'task:form_open', ref: 'home_visit' },
        { action: 'task_list:leave' },
      ]);

      expect(lastTwoSessions[1].events).excludingEvery('timestamp').to.deep.equal([
        { action: 'task_list:open' },
        { action: 'task_list:loaded', detail: '3' },
        { action: 'task_list:scroll' },
        { action: 'task:open', ref: 'person_create', detail: '1' },
        { action: 'task:form_open', ref: 'home_visit' },
        { action: 'task_list:leave' },
      ]);
    });

    it('should flush interaction logs to the server meta db when the browser tab is hidden', async () => {
      await tasksPage.openTaskByIndex(0);

      // Simulate the browser tab becoming hidden (e.g., user switches tab or minimizes)
      await triggerVisibilityChange();

      // Sync to replicate the local meta db to the server
      await commonPage.sync();

      const interactionDocs = await getInteractionDocsFromMetaDb(chw);
      expect(interactionDocs.length).to.equal(1);

      const doc = interactionDocs.find(d => d.type === 'interaction-log');
      expect(doc).to.not.be.undefined;
      expect(doc.metadata.user).to.equal(chw.username);
      expect(doc.sessions).to.have.lengthOf.at.least(1);

      const lastSession = doc.sessions[doc.sessions.length - 1];
      expect(lastSession.events).excludingEvery('timestamp').to.deep.equal([
        { action: 'task_list:open' },
        { action: 'task_list:loaded', detail: '3' },
        { action: 'task:open', ref: 'person_create', detail: '0' },
        { action: 'task:form_open', ref: 'home_visit' },
      ]);
    });
  });
});
