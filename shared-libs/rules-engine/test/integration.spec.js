const chai = require('chai');
const moment = require('moment');
const chaiExclude = require('chai-exclude');
const { MS_IN_DAY, noolsPartnerTemplate } = require('./mocks');
const cloneDeep = require('lodash/cloneDeep');

const memdownMedic = require('@medic/memdown');
const nools = require('nools');
const sinon = require('sinon');

const RulesEngine = require('../src');
const rulesEmitter = require('../src/rules-emitter');
const settingsDoc = require('../../../config/default/app_settings.json');

const { expect } = chai;
chai.use(chaiExclude);

let db;
const userDoc = { _id: 'user' };

const THE_FUTURE = 1500000000000;
const patientContact = {
  _id: 'patient',
  name: 'chw',
  type: 'contact',
  contact_type: 'person',
  patient_id: 'patient_id',
};

const pregnancyFollowupReport = {
  _id: 'report',
  type: 'data_record',
  form: 'pregnancy',
  fields: {
    t_pregnancy_follow_up_date: new Date(1).toISOString(),
    patient_uuid: 'patient'
  },
  reported_date: 0,
};

const pregnancyRegistrationReport = {
  _id: 'pregReg',
  type: 'data_record',
  form: 'pregnancy',
  fields: {
    lmp_date_8601: THE_FUTURE,
    patient_id: patientContact._id,
  },
  reported_date: THE_FUTURE,
};

const reportByPatientIdOnly = {
  _id: 'report',
  type: 'data_record',
  form: 'pregnancy',
  fields: {
    t_pregnancy_follow_up_date: new Date(1).toISOString(),
  },
  patient_id: patientContact.patient_id,
  reported_date: 0,
};

const expectedQueriesForAllFreshData = [
  'medic-client/contacts_by_type',
  'medic-client/reports_by_subject',
  'medic-client/tasks'
];
const expectedQueriesForFreshData = [
  'medic-client/reports_by_subject',
  'medic-client/tasks',
  'medic-client/tasks',
];

const fetchTasks = async (db, targetEmissionFilter) => {
  const targets = await RulesEngine.fetchTargets(db, targetEmissionFilter);
  return targets.reduce((agg, target) => {
    agg[target.id] = target;
    return agg;
  }, {});
};

describe('Rules Engine Integration Tests', () => {
  before(async () => {
    const stateDb = await memdownMedic('../..');
    sinon.useFakeTimers(THE_FUTURE);
    await RulesEngine.initialize(stateDb, settingsDoc, userDoc);
  });

  after(() => {
    rulesEmitter.shutdown();
  });

  let configHashSalt = 0;
  beforeEach(async () => {
    /*
    Some nuanced behavior of medic-nootils with useFakeTimers: due to the closures around { Date } in medic-nootils, the library uses the fake date at the time the
    library is created. In this case, that is the time of RulesEngine.initialize or RulesEngine.rulesConfigChange. This can lead to change behaviors with Utils.now()
    */
    sinon.useFakeTimers(THE_FUTURE);
   
    settingsDoc.tasks.rules += ' '; // bust cache with fresh rules
    await RulesEngine.rulesConfigChange(settingsDoc, userDoc);
    await rulesEmitter.initialize(settingsDoc, userDoc);

    sinon.useFakeTimers(1);
    db = await memdownMedic('../..');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('behavior after initialization', async () => {
    expect(RulesEngine.isEnabled()).to.be.true;
    // the nools "flow" should remain in memory so we don't recompile the partner code
    expect(nools.getFlow('medic')).to.not.be.undefined;
  });

  it('unknown contact yields zero tasks and empty targets', async () => {
    await db.bulkDocs([patientContact, pregnancyFollowupReport]);
    sinon.spy(db, 'query');

    expect(await RulesEngine.fetchTasksFor(db, ['abc'])).to.deep.eq([]);
    // First call fetches fresh data
    expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length);

    expect(await RulesEngine.fetchTasksFor(db, ['abc'])).to.deep.eq([]);

    // Additional calls only fetch the calculated tasks
    expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length + 1);

    const targets = await RulesEngine.fetchTargets(db);
    expect(targets.length).to.eq(settingsDoc.tasks.targets.items.length);
    expect(targets.some(t => t.total > 0)).to.be.false;
  });

  it('fail facility_reminder due to time window', async () => {
    // the task is 5 days old when it is discovered
    const NOW = MS_IN_DAY * 5;
    sinon.useFakeTimers(NOW);

    await triggerFacilityReminderInReadyState(['patient']);

    // the task expires four days later, but the contact is not dirty. so no recalculation, just decay
    sinon.useFakeTimers(MS_IN_DAY * 9);
    const noTasks = await RulesEngine.fetchTasksFor(db, ['patient']);
    expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length + 1);
    expect(noTasks).to.have.property('length', 0);
    expect(db.bulkDocs.callCount).to.eq(2);
    expect(db.bulkDocs.args[1][0]).to.have.property('length', 1);
    expect(db.bulkDocs.args[1][0][0]).to.deep.include({
      _id: `task~user~report~pregnancy-facility-visit-reminder~2~${NOW}`,
      requester: 'patient',
      owner: 'patient',
      state: 'Failed',
      stateHistory: [
        {
          state: 'Ready',
          timestamp: NOW,
        },
        {
          state: 'Failed',
          timestamp: Date.now(),
        },
      ]
    });

    // a month later, no new doc will be created
    sinon.useFakeTimers(MS_IN_DAY * 39);
    const monthLater = await RulesEngine.fetchTasksFor(db, ['patient']);
    expect(monthLater).to.have.property('length', 0);
    expect(db.bulkDocs.callCount).to.eq(2);
  });

  it('fail facility_reminder because of fresh doc merge', async () => {
    await triggerFacilityReminderInReadyState(['patient']);

    // move forward 9 days, the contact is dirty, the task is recalculated
    sinon.useFakeTimers(MS_IN_DAY * 9);
    const noTasks = await RulesEngine.fetchTasksFor(db, ['patient']);
    expect(db.query.args.map(args => args[0])).to.deep.eq([...expectedQueriesForFreshData, ...expectedQueriesForFreshData]);
    expect(noTasks).to.have.property('length', 0);
    expect(db.bulkDocs.callCount).to.eq(2);
    expect(db.bulkDocs.args[1][0]).to.have.property('length', 1);
    expect(db.bulkDocs.args[1][0][0]).to.deep.include({
      _id: 'task~user~report~pregnancy-facility-visit-reminder~2~1',
      state: 'Failed',
      stateHistory: [
        {
          state: 'Ready',
          timestamp: 1,
        },
        {
          state: 'Failed',
          timestamp: Date.now(),
        },
      ]
    });
  });

  it('complete task.anc.facility_reminder', async () => {
    await triggerFacilityReminderInReadyState(['patient']);

    await db.put({
      _id: 'reminder',
      type: 'data_record',
      form: 'pregnancy_facility_visit_reminder',
      fields: [],
      patient_id: 'patient',
      reported_date: Date.now(),
    });

    // changes feed marks contact for updates
    await RulesEngine.updateEmissionsFor(db, 'patient');
    expect(db.bulkDocs.callCount).to.eq(2);

    // requery via 'tasks tab' interface instead of 'contacts tab' interface
    const completedTask = await RulesEngine.fetchTasksFor(db);
    expect(completedTask).to.have.property('length', 0);
    expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length + 1 /* update emissions for*/ + expectedQueriesForAllFreshData.length + 1 /* tasks */);
    expect(db.bulkDocs.callCount).to.eq(3);
    expect(db.bulkDocs.args[2][0]).to.have.property('length', 1);
    expect(db.bulkDocs.args[2][0][0]).to.deep.include({
      _id: 'task~user~report~pregnancy-facility-visit-reminder~2~1',
      state: 'Completed',
      stateHistory: [
        {
          state: 'Ready',
          timestamp: 1,
        },
        {
          state: 'Completed',
          timestamp: 1,
        },
      ]
    });

    await RulesEngine.fetchTargets(db);
    expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length + 1 /* update emissions for*/ + expectedQueriesForAllFreshData.length + 1 /* tasks */);
  });

  it('cancel facility_reminder due to "purged" report', async () => {
    await triggerFacilityReminderInReadyState(['patient']);

    const existingPregnancy = await db.get(pregnancyFollowupReport._id);
    await db.put({
      _id: existingPregnancy._id,
      _rev: existingPregnancy._rev,
      deleted: true,
    });

    // changes feed marks contact for updates
    await RulesEngine.updateEmissionsFor(db, 'patient');
    expect(db.bulkDocs.callCount).to.eq(2);

    const completedTask = await RulesEngine.fetchTasksFor(db, ['patient']);
    expect(completedTask).to.have.property('length', 0);
    expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length * 2 + 1);
    expect(db.bulkDocs.callCount).to.eq(3);
    expect(db.bulkDocs.args[2][0]).to.have.property('length', 1);

    const [taskDoc] = db.bulkDocs.args[2][0];
    expect(taskDoc).to.deep.include({
      _id: 'task~user~report~pregnancy-facility-visit-reminder~2~1',
      state: 'Cancelled',
      stateHistory: [
        {
          state: 'Ready',
          timestamp: 1,
        },
        {
          state: 'Cancelled',
          timestamp: 1,
        },
      ]
    });

    // new pregnancy report causes new task
    const secondPregnancyReport = Object.assign({}, pregnancyFollowupReport, { _id: 'newPregnancy' });
    await db.put(secondPregnancyReport);
    await RulesEngine.updateEmissionsFor(db, 'patient');
    const secondReadyTasks = await RulesEngine.fetchTasksFor(db, ['patient']);
    expect(secondReadyTasks).to.have.property('length', 1);
    expect(secondReadyTasks[0].state).to.eq('Ready');
    expect(secondReadyTasks[0]._id).to.not.eq(taskDoc._id);
  });

  it('config change disables rules engine, causes no cancelations or errors', async () => {
    await triggerFacilityReminderInReadyState(['patient']);

    const updatedSettings = cloneDeep(settingsDoc);
    updatedSettings.tasks.rules = noolsPartnerTemplate('const nothing = [];');
    await RulesEngine.rulesConfigChange(updatedSettings, userDoc);
    expect(db.bulkDocs.callCount).to.eq(1);

    const completedTask = await RulesEngine.fetchTasksFor(db, ['patient']);
    expect(completedTask).to.have.property('length', 0);
    expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length);
  });

  it('settings update to invalid config yields no tasks displayed or updated', async () => {
    await triggerFacilityReminderInReadyState(['patient']);

    const updatedSettings = cloneDeep(settingsDoc);
    updatedSettings.tasks.rules = noolsPartnerTemplate('not javascript');
    await RulesEngine.rulesConfigChange(updatedSettings, userDoc);
    const successfulRecompile = rulesEmitter.isEnabled();
    expect(successfulRecompile).to.be.false;
    expect(RulesEngine.isEnabled()).to.be.false;

    const tasks = await RulesEngine.fetchTasksFor(db, ['patient']);
    expect(tasks).to.be.empty;
  });

  it('reloading same config does not bust cache', async () => {
    await triggerFacilityReminderInReadyState(['patient']);

    await RulesEngine.rulesConfigChange(settingsDoc, userDoc, configHashSalt);
    const successfulRecompile = rulesEmitter.isEnabled();
    expect(successfulRecompile).to.be.true;
    expect(RulesEngine.isEnabled()).to.be.true;

    const readyTasks = await RulesEngine.fetchTasksFor(db, ['patient']);
    expect(readyTasks.length).to.eq(1);
    expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length + 1);
  });

  it('purged doc will not be recreated due to isTimely window', async () => {
    await db.bulkDocs([patientContact, pregnancyFollowupReport]);
    const tasks = await RulesEngine.fetchTasksFor(db);
    expect(tasks).to.have.property('length', 1);

    sinon.useFakeTimers(moment().add(90, 'days').valueOf());
    const purgedTask = {
      _id: tasks[0]._id,
      _rev: tasks[0]._rev,
      purged: true,
    };
    await db.bulkDocs([purgedTask]);

    const tasksAfterPurge = await RulesEngine.fetchTasksFor(db);
    expect(tasksAfterPurge).to.have.property('length', 0);

    const allTasks = await db.query('medic-client/tasks');
    expect(allTasks.total_rows).to.eq(0);
  });

  it('mark dirty by subject id (tasks tab scenario)', async () => {
    sinon.spy(rulesEmitter, 'getEmissionsFor');
    const firstTasks = await triggerFacilityReminderInReadyState(undefined, [patientContact, reportByPatientIdOnly]);
    expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
    expect(rulesEmitter.getEmissionsFor.args[0]).excludingEvery('_rev').to.deep.eq([
      [patientContact],
      [reportByPatientIdOnly],
      []
    ]);

    await RulesEngine.updateEmissionsFor(db, reportByPatientIdOnly.patient_id);
    const secondTasks = await RulesEngine.fetchTasksFor(db);
    expect(rulesEmitter.getEmissionsFor.callCount).to.eq(2);
    expect(rulesEmitter.getEmissionsFor.args[1]).excludingEvery('_rev').to.deep.eq([
      [patientContact],
      [reportByPatientIdOnly],
      firstTasks
    ]);

    expect(secondTasks).to.deep.eq(firstTasks);
    expect(db.query.args.map(args => args[0])).to.deep.eq([...expectedQueriesForAllFreshData, 'medic-client/tasks', 'medic-client/contacts_by_reference', ...expectedQueriesForFreshData]);
  });

  it('mark dirty by subject id (contacts tab scenario)', async () => {
    sinon.spy(rulesEmitter, 'getEmissionsFor');
    const firstTasks = await triggerFacilityReminderInReadyState(['patient'], [patientContact, reportByPatientIdOnly]);
    expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
    expect(rulesEmitter.getEmissionsFor.args[0]).excludingEvery('_rev').to.deep.eq([
      [patientContact],
      [reportByPatientIdOnly],
      []
    ]);

    await RulesEngine.updateEmissionsFor(db, reportByPatientIdOnly.patient_id);
    const secondTasks = await RulesEngine.fetchTasksFor(db, [patientContact._id]);
    expect(rulesEmitter.getEmissionsFor.callCount).to.eq(2);
    expect(rulesEmitter.getEmissionsFor.args[1]).excludingEvery('_rev').to.deep.eq([
      [patientContact],
      [reportByPatientIdOnly],
      firstTasks
    ]);

    expect(secondTasks).to.deep.eq(firstTasks);
    expect(db.query.args.map(args => args[0])).to.deep.eq([...expectedQueriesForFreshData, 'medic-client/contacts_by_reference', ...expectedQueriesForFreshData]);
  });

  it('headless scenario (tasks tab)', async () => {
    const headlessReport = { _id: 'report', type: 'data_record', form: 'form', patient_id: 'headless' };
    const headlessReport2 = { _id: 'report2', type: 'data_record', form: 'form', patient_id: 'headless2' };
    const taskOwnedByHeadless = { _id: 'task', type: 'task', state: 'Ready', owner: 'headless', emission: { _id: 'emitted', dueDate: Date.now(), startTime: Date.now(), endTime: Date.now(), } };
    const taskEmittedByHeadless2 = { _id: 'task2', type: 'task', state: 'Ready', requester: 'headless2', emission: { _id: 'emitted', dueDate: Date.now(), startTime: Date.now(), endTime: Date.now(), } };
    await db.bulkDocs([headlessReport, headlessReport2, taskOwnedByHeadless, taskEmittedByHeadless2]);

    sinon.spy(db, 'bulkDocs');
    sinon.spy(db, 'query');
    sinon.spy(rulesEmitter, 'getEmissionsFor');
    const firstResult = await RulesEngine.fetchTasksFor(db);
    expect(rulesEmitter.getEmissionsFor.args).excludingEvery(['_rev', 'state', 'stateHistory']).to.deep.eq([[[], [headlessReport, headlessReport2], [taskEmittedByHeadless2]]]);
    expect(db.query.args.map(args => args[0])).to.deep.eq([...expectedQueriesForAllFreshData, 'medic-client/tasks']);
    expect(firstResult).excludingEvery('_rev').to.deep.eq([taskOwnedByHeadless]);
    expect(db.bulkDocs.callCount).to.eq(1); // taskEmittedByHeadless2 gets cancelled

    await RulesEngine.updateEmissionsFor(db, 'headless');
    const secondResult = await RulesEngine.fetchTasksFor(db);
    expect(secondResult).to.deep.eq(firstResult);
    expect(db.query.args.map(args => args[0]).length).to.deep.eq(expectedQueriesForAllFreshData.length + 2 /* tasks, updateFor */ + expectedQueriesForFreshData.length);

    await RulesEngine.fetchTasksFor(db);
    expect(db.query.args.map(args => args[0]).length).to.deep.eq(expectedQueriesForAllFreshData.length + 2 /* tasks, updateFor */ + expectedQueriesForFreshData.length + 1 /* tasks */);
  });

  it('targets for two pregnancy registrations', async () => {
    const patientContact2 = Object.assign({}, patientContact, { _id: 'patient2', patient_id: 'patient_id2', });
    const pregnancyRegistrationReport2 = Object.assign({}, pregnancyRegistrationReport, { _id: 'pregReg2', fields: { lmp_date_8601: THE_FUTURE, patient_id: patientContact2.patient_id }, reported_date: THE_FUTURE+1 });
    await db.bulkDocs([patientContact, patientContact2, pregnancyRegistrationReport, pregnancyRegistrationReport2]);

    sinon.spy(db, 'bulkDocs');
    sinon.spy(db, 'query');
    const targets = await fetchTasks(db);
    expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
    expect(targets[['pregnancy-registrations-this-month']].value).to.deep.eq({
      total: 2,
      pass: 2,
    });

    const sameTargets = await fetchTasks(db);
    expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
    expect(sameTargets).to.deep.eq(targets);

    const filter = emission => {
      const emissionDate = moment(emission.date);
      return emissionDate.valueOf() === THE_FUTURE; // based on report.reported_date
    };
    const filteredTargets = await fetchTasks(db, filter);
    expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
    expect(filteredTargets['pregnancy-registrations-this-month'].value).to.deep.eq({
      total: 1,
      pass: 1,
    });
  });
});

const triggerFacilityReminderInReadyState = async (selectBy, docs = [patientContact, pregnancyFollowupReport]) => {
  await db.bulkDocs(docs);
  sinon.spy(db, 'bulkDocs');
  sinon.spy(db, 'query');
  const tasks = await RulesEngine.fetchTasksFor(db, selectBy);
  expect(tasks).to.have.property('length', 1);
  expect(db.query.args.map(args => args[0])).to.deep.eq(selectBy ? expectedQueriesForFreshData : [...expectedQueriesForAllFreshData, 'medic-client/tasks']);
  expect(db.bulkDocs.callCount).to.eq(1);
  expect(tasks[0]).to.deep.include({
    _id: `task~user~report~pregnancy-facility-visit-reminder~2~${Date.now()}`,
    state: 'Ready',
    requester: 'patient',
    owner: 'patient',
  });
  expect(tasks).excluding('_rev').to.deep.eq(db.bulkDocs.args[0][0]);
  return tasks;
};
