const chai = require('chai');
const moment = require('moment');
const chaiExclude = require('chai-exclude');
const { MS_IN_DAY, simpleNoolsTemplate, engineSettings, defaultConfigSettingsDoc } = require('./mocks');

const memdownMedic = require('@medic/memdown');
const nools = require('nools');
const sinon = require('sinon');

const RulesEngine = require('../src');
const rulesEmitter = require('../src/rules-emitter');
const calendarInterval = require('@medic/calendar-interval');

const { expect } = chai;
chai.use(chaiExclude);

let db;
let rulesEngine;


const TEST_START = 1500000000000;
const EXPECTED_TASK_ID_PREFIX = 'task~org.couchdb.user:username~report~pregnancy-facility-visit-reminder~anc.facility_reminder'; // eslint-disable-line
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
    t_pregnancy_follow_up_date: new Date(TEST_START).toISOString(),
    patient_uuid: 'patient'
  },
  reported_date: 0,
};

const pregnancyRegistrationReport = {
  _id: 'pregReg',
  type: 'data_record',
  form: 'pregnancy',
  fields: {
    lmp_date_8601: TEST_START,
    patient_id: patientContact._id,
  },
  reported_date: TEST_START,
};

const reportByPatientIdOnly = {
  _id: 'report',
  type: 'data_record',
  form: 'pregnancy',
  fields: {
    t_pregnancy_follow_up_date: new Date(TEST_START).toISOString(),
  },
  patient_id: patientContact.patient_id,
  reported_date: 0,
};

const expectedQueriesForAllFreshData = [
  'medic-client/contacts_by_type',
  'medic-client/reports_by_subject',
  'medic-client/tasks_by_contact'
];
const expectedQueriesForFreshData = [
  'medic-client/reports_by_subject',
  'medic-client/tasks_by_contact',
  'medic-client/tasks_by_contact',
];

const fetchTargets = async (filterInterval) => {
  filterInterval = filterInterval || calendarInterval.getInterval(engineSettings().monthStartDate, TEST_START);
  const targets = await rulesEngine.fetchTargets(filterInterval);
  return targets.reduce((agg, target) => {
    agg[target.id] = target;
    return agg;
  }, {});
};

let clock;

const declarativeScenarios = [true, false];

describe(`Rules Engine Integration Tests`, () => {
  before(async () => {
    clock = sinon.useFakeTimers(TEST_START);
    db = await memdownMedic('../..');
    rulesEngine = RulesEngine(db);
    await rulesEngine.initialize(engineSettings());
  });

  after(() => {
    rulesEmitter.shutdown();
  });

  let configHashSalt = 0;

  afterEach(() => {
    sinon.restore();
    clock.restore();
  });

  for (const rulesAreDeclarative of declarativeScenarios) {
    // Some nuanced behavior of medic-nootils with useFakeTimers: due to the closures around { Date } in medic-nootils,
    // the library uses the fake date at the time the library is created. In this case, that is the time of
    // rulesEngine.initialize or rulesEngine.rulesConfigChange. This can lead to strange behaviors with Utils.now()
    describe(`rulesAreDeclarative: ${rulesAreDeclarative}`, () => {
      beforeEach(async () => {
        clock = sinon.useFakeTimers(TEST_START);
    
        db = await memdownMedic('../..');
        rulesEngine = RulesEngine(db);
    
        configHashSalt++;
        const rulesSettings = engineSettings({ rulesAreDeclarative, configHashSalt });
        await rulesEngine.rulesConfigChange(rulesSettings);  
      });

      if (!rulesAreDeclarative) {
        it('behavior after initialization', async () => {
          expect(rulesEngine.isEnabled()).to.be.true;
          // the nools "flow" should remain in memory so we don't recompile the partner code
          expect(nools.getFlow('medic')).to.not.be.undefined;
        });
      }

      it('unknown contact yields zero tasks and empty targets', async () => {
        await db.bulkDocs([patientContact, pregnancyFollowupReport]);
        sinon.spy(db, 'query');

        expect(await rulesEngine.fetchTasksFor(['abc'])).to.deep.eq([]);
        // First call fetches fresh data
        expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length);

        expect(await rulesEngine.fetchTasksFor(['abc'])).to.deep.eq([]);

        // Additional calls only fetch the calculated tasks
        expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length + 1);

        const targets = await rulesEngine.fetchTargets();
        expect(targets.length).to.eq(defaultConfigSettingsDoc.tasks.targets.items.length);
        expect(targets.some(t => t.total > 0)).to.be.false;
      });

      it('fail facility_reminder due to time window', async () => {
        // the task is 5 days old when it is discovered
        const NOW = TEST_START + MS_IN_DAY * 5;
        sinon.useFakeTimers(NOW);

        await triggerFacilityReminderInReadyState(['patient']);

        // the task expires four days later, but the contact is not dirty. so no recalculation, just decay
        sinon.useFakeTimers(TEST_START + MS_IN_DAY * 9);
        const noTasks = await rulesEngine.fetchTasksFor(['patient']);
        expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length + 1);
        expect(noTasks).to.have.property('length', 0);
        expect(db.bulkDocs.callCount).to.eq(2);
        expect(db.bulkDocs.args[1][0]).to.have.property('length', 1);
        expect(db.bulkDocs.args[1][0][0]).to.deep.include({
          _id: `task~org.couchdb.user:username~report~pregnancy-facility-visit-reminder~anc.facility_reminder~${NOW}`,
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
        sinon.useFakeTimers(TEST_START + MS_IN_DAY * 39);
        const monthLater = await rulesEngine.fetchTasksFor(['patient']);
        expect(monthLater).to.have.property('length', 0);
        expect(db.bulkDocs.callCount).to.eq(3);
        expect(db.bulkDocs.args[2][0].docs.length).to.equal(1);
        const date = moment(TEST_START + MS_IN_DAY).format('YYYY-MM');
        expect(db.bulkDocs.args[2][0].docs[0]).to.deep.include({
          _id: `target~${date}~user~org.couchdb.user:username`,
          type: 'target',
          owner: 'user',
          reporting_period: date,
        });
      });

      it('fail facility_reminder because of fresh doc merge', async () => {
        await triggerFacilityReminderInReadyState(['patient']);

        // move forward 9 days, the contact is dirty, the task is recalculated
        sinon.useFakeTimers(TEST_START + MS_IN_DAY * 9);
        const noTasks = await rulesEngine.fetchTasksFor(['patient']);
        expect(db.query.args.map(args => args[0]))
          .to.deep.eq([...expectedQueriesForFreshData, ...expectedQueriesForFreshData]);
        expect(noTasks).to.have.property('length', 0);
        expect(db.bulkDocs.callCount).to.eq(2);
        expect(db.bulkDocs.args[1][0]).to.have.property('length', 1);
        expect(db.bulkDocs.args[1][0][0]).to.deep.include({
          _id: `${EXPECTED_TASK_ID_PREFIX}~${TEST_START}`,
          state: 'Failed',
          stateHistory: [
            {
              state: 'Ready',
              timestamp: TEST_START,
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
        await rulesEngine.updateEmissionsFor('patient');
        expect(db.bulkDocs.callCount).to.eq(2);

        // requery via 'tasks tab' interface instead of 'contacts tab' interface
        const completedTask = await rulesEngine.fetchTasksFor();
        expect(completedTask).to.have.property('length', 0);
        expect(db.query.callCount).to.eq(
          expectedQueriesForFreshData.length + 1 /* update emissions for*/ +
          expectedQueriesForAllFreshData.length + 1 /* tasks */
        );
        expect(db.bulkDocs.callCount).to.eq(3);
        expect(db.bulkDocs.args[2][0]).to.have.property('length', 1);
        expect(db.bulkDocs.args[2][0][0]).to.deep.include({
          _id: `${EXPECTED_TASK_ID_PREFIX}~${TEST_START}`,
          state: 'Completed',
          stateHistory: [
            {
              state: 'Ready',
              timestamp: TEST_START,
            },
            {
              state: 'Completed',
              timestamp: TEST_START,
            },
          ]
        });

        await rulesEngine.fetchTargets();
        expect(db.query.callCount).to.eq(
          expectedQueriesForFreshData.length + 1 /* update emissions for*/ +
          expectedQueriesForAllFreshData.length + 1 /* tasks */
        );
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
        await rulesEngine.updateEmissionsFor('patient');
        expect(db.bulkDocs.callCount).to.eq(2);

        const completedTask = await rulesEngine.fetchTasksFor(['patient']);
        expect(completedTask).to.have.property('length', 0);
        expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length * 2 + 1);
        expect(db.bulkDocs.callCount).to.eq(3);
        expect(db.bulkDocs.args[2][0]).to.have.property('length', 1);

        const [taskDoc] = db.bulkDocs.args[2][0];
        expect(taskDoc).to.deep.include({
          _id: `${EXPECTED_TASK_ID_PREFIX}~${TEST_START}`,
          state: 'Cancelled',
          stateHistory: [
            {
              state: 'Ready',
              timestamp: TEST_START,
            },
            {
              state: 'Cancelled',
              timestamp: TEST_START,
            },
          ]
        });

        // new pregnancy report causes new task
        const secondPregnancyReport = Object.assign({}, pregnancyFollowupReport, { _id: 'newPregnancy' });
        await db.put(secondPregnancyReport);
        await rulesEngine.updateEmissionsFor('patient');
        const secondReadyTasks = await rulesEngine.fetchTasksFor(['patient']);
        expect(secondReadyTasks).to.have.property('length', 1);
        expect(secondReadyTasks[0].state).to.eq('Ready');
        expect(secondReadyTasks[0]._id).to.not.eq(taskDoc._id);
      });

      it('config change causes reload with no cancelations or errors', async () => {
        await triggerFacilityReminderInReadyState(['patient']);

        const settings = { rulesAreDeclarative, rules: 'const nothing = [];' };
        const updatedSettings = engineSettings(settings, simpleNoolsTemplate);
        await rulesEngine.rulesConfigChange(updatedSettings);
        expect(db.bulkDocs.callCount).to.eq(1);

        const completedTask = await rulesEngine.fetchTasksFor(['patient']);
        expect(completedTask).to.have.property('length', 0);
        expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length * 2);
      });

      it('settings update to invalid config yields no tasks displayed or updated', async () => {
        await triggerFacilityReminderInReadyState(['patient']);

        try {
          const settings = { rulesAreDeclarative, rules: 'not javascript' };
          const updatedSettings = engineSettings(settings, simpleNoolsTemplate);
          await rulesEngine.rulesConfigChange(updatedSettings);
          expect('throw').to.throw;
        } catch (err) {
          expect(err.message).to.include('Unexpected identifier');
        }

        const successfulRecompile = rulesEmitter.isEnabled();
        expect(successfulRecompile).to.be.false;
        expect(rulesEngine.isEnabled()).to.be.false;

        const tasks = await rulesEngine.fetchTasksFor(['patient']);
        expect(tasks).to.be.empty;
      });

      it('reloading same config does not bust cache', async () => {
        await triggerFacilityReminderInReadyState(['patient']);

        await rulesEngine.rulesConfigChange(engineSettings({ rulesAreDeclarative, configHashSalt }));
        const successfulRecompile = rulesEmitter.isEnabled();
        expect(successfulRecompile).to.be.true;
        expect(rulesEngine.isEnabled()).to.be.true;

        const readyTasks = await rulesEngine.fetchTasksFor(['patient']);
        expect(readyTasks.length).to.eq(1);
        expect(db.query.callCount).to.eq(expectedQueriesForFreshData.length + 1);
      });

      it('purged doc will not be recreated due to isTimely window', async () => {
        await db.bulkDocs([patientContact, pregnancyFollowupReport]);
        const tasks = await rulesEngine.fetchTasksFor();
        expect(tasks).to.have.property('length', 1);

        sinon.useFakeTimers(moment().add(90, 'days').valueOf());
        const purgedTask = {
          _id: tasks[0]._id,
          _rev: tasks[0]._rev,
          purged: true,
        };
        await db.bulkDocs([purgedTask]);

        const tasksAfterPurge = await rulesEngine.fetchTasksFor();
        expect(tasksAfterPurge).to.have.property('length', 0);

        const allTasks = await db.query('medic-client/tasks_by_contact');
        expect(allTasks.total_rows).to.eq(0);
      });

      it('mark dirty by subject id (tasks tab scenario)', async () => {
        sinon.spy(rulesEmitter, 'getEmissionsFor');
        const firstTasks = await triggerFacilityReminderInReadyState(
          undefined,
          [patientContact, reportByPatientIdOnly],
        );
        expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
        expect(rulesEmitter.getEmissionsFor.args[0]).excludingEvery('_rev').to.deep.eq([
          [patientContact],
          [reportByPatientIdOnly],
          []
        ]);

        await rulesEngine.updateEmissionsFor(reportByPatientIdOnly.patient_id);
        const secondTasks = await rulesEngine.fetchTasksFor();
        expect(rulesEmitter.getEmissionsFor.callCount).to.eq(2);
        expect(rulesEmitter.getEmissionsFor.args[1]).excludingEvery('_rev').to.deep.eq([
          [patientContact],
          [reportByPatientIdOnly],
          firstTasks
        ]);

        expect(secondTasks).to.deep.eq(firstTasks);
        expect(db.query.args.map(args => args[0])).to.deep.eq([
          ...expectedQueriesForAllFreshData,
          'medic-client/tasks_by_contact',
          'medic-client/contacts_by_reference',
          ...expectedQueriesForFreshData
        ]);
      });

      it('mark dirty by subject id (contacts tab scenario)', async () => {
        sinon.spy(rulesEmitter, 'getEmissionsFor');
        const firstTasks = await triggerFacilityReminderInReadyState(
          ['patient'],
          [patientContact, reportByPatientIdOnly],
        );
        expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
        expect(rulesEmitter.getEmissionsFor.args[0]).excludingEvery('_rev').to.deep.eq([
          [patientContact],
          [reportByPatientIdOnly],
          []
        ]);

        await rulesEngine.updateEmissionsFor(reportByPatientIdOnly.patient_id);
        const secondTasks = await rulesEngine.fetchTasksFor([patientContact._id]);
        expect(rulesEmitter.getEmissionsFor.callCount).to.eq(2);
        expect(rulesEmitter.getEmissionsFor.args[1]).excludingEvery('_rev').to.deep.eq([
          [patientContact],
          [reportByPatientIdOnly],
          firstTasks
        ]);

        expect(secondTasks).to.deep.eq(firstTasks);
        expect(db.query.args.map(args => args[0])).to.deep.eq([
          ...expectedQueriesForFreshData,
          'medic-client/contacts_by_reference',
          ...expectedQueriesForFreshData
        ]);
      });

      it('headless scenario (tasks tab)', async () => {
        const headlessReport = { _id: 'report', type: 'data_record', form: 'form', patient_id: 'headless' };
        const headlessReport2 = { _id: 'report2', type: 'data_record', form: 'form', patient_id: 'headless2' };
        const taskOwnedByHeadless = { _id: 'task', type: 'task', state: 'Ready', owner: 'headless', emission: {
          _id: 'emitted', dueDate: Date.now(), startDate: Date.now(), endDate: Date.now(), }
        };
        const taskEmittedByHeadless2 = { _id: 'task2', type: 'task', state: 'Ready', requester: 'headless2', emission: {
          _id: 'emitted', dueDate: Date.now(), startDate: Date.now(), endDate: Date.now(), }
        };
        await db.bulkDocs([headlessReport, headlessReport2, taskOwnedByHeadless, taskEmittedByHeadless2]);

        sinon.spy(db, 'bulkDocs');
        sinon.spy(db, 'query');
        sinon.spy(rulesEmitter, 'getEmissionsFor');
        const firstResult = await rulesEngine.fetchTasksFor();
        expect(rulesEmitter.getEmissionsFor.args).excludingEvery(['_rev', 'state', 'stateHistory'])
          .to.deep.eq([[[], [headlessReport, headlessReport2], [taskEmittedByHeadless2]]]);
        expect(db.query.args.map(args => args[0]))
          .to.deep.eq([...expectedQueriesForAllFreshData, 'medic-client/tasks_by_contact']);
        expect(firstResult).excludingEvery('_rev').to.deep.eq([taskOwnedByHeadless]);
        expect(db.bulkDocs.callCount).to.eq(1); // taskEmittedByHeadless2 gets cancelled

        await rulesEngine.updateEmissionsFor('headless');
        const secondResult = await rulesEngine.fetchTasksFor();
        expect(secondResult).to.deep.eq(firstResult);
        expect(db.query.args.map(args => args[0]).length).to.deep.eq(
          expectedQueriesForAllFreshData.length + 2 /* tasks, updateFor */ +
          expectedQueriesForFreshData.length
        );

        await rulesEngine.fetchTasksFor();
        expect(db.query.args.map(args => args[0]).length).to.deep.eq(
          expectedQueriesForAllFreshData.length + 2 /* tasks, updateFor */ +
          expectedQueriesForFreshData.length + 1 /* tasks */
        );
      });

      it('targets for two pregnancy registrations', async () => {
        const patientContact2 = Object.assign({}, patientContact, { _id: 'patient2', patient_id: 'patient_id2', });
        const pregnancyRegistrationReport2 = Object.assign(
          {},
          pregnancyRegistrationReport,
          { _id: 'pregReg2', fields: {
            lmp_date_8601: TEST_START, patient_id: patientContact2.patient_id
          }, reported_date: TEST_START+2
          });
        await db.bulkDocs([patientContact, patientContact2, pregnancyRegistrationReport, pregnancyRegistrationReport2]);

        sinon.spy(db, 'bulkDocs');
        sinon.spy(db, 'query');
        const targets = await fetchTargets();
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(targets[['pregnancy-registrations-this-month']].value).to.deep.eq({
          total: 2,
          pass: 2,
        });

        const sameTargets = await fetchTargets();
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(sameTargets).to.deep.eq(targets);

        const interval = { start: TEST_START - 1, end: TEST_START + 1 };
        const filteredTargets = await fetchTargets(interval);
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(filteredTargets['pregnancy-registrations-this-month'].value).to.deep.eq({
          total: 1,
          pass: 1,
        });
      });

      it('targets for three pregnancy registrations for the same patient', async () => {
        const pregnancyRegistrationReport2 = Object.assign(
          {},
          pregnancyRegistrationReport,
          {
            _id: '2nd-pregReg',
            fields: { lmp_date_8601: TEST_START, patient_id: patientContact._id, },
            reported_date: TEST_START + 2
          });
        const pregnancyRegistrationReport3 = Object.assign(
          {},
          pregnancyRegistrationReport,
          {
            _id: '3rd-pregReg',
            fields: { lmp_date_8601: TEST_START - 3, patient_id: patientContact.patient_id, },
            reported_date: TEST_START - 3
          });

        await db.bulkDocs([
          patientContact,
          pregnancyRegistrationReport,
          pregnancyRegistrationReport2,
          pregnancyRegistrationReport3,
        ]);

        sinon.spy(db, 'bulkDocs');
        sinon.spy(db, 'query');
        const targets = await fetchTargets();
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(targets[['pregnancy-registrations-this-month']].value).to.deep.eq({
          total: 1,
          pass: 1,
        });

        const sameTargets = await fetchTargets();
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(sameTargets).to.deep.eq(targets);

        // the latest report, 2nd-pregReg is in this interval
        let interval = { start: TEST_START + 1, end: TEST_START + 2 };
        let filteredTargets = await fetchTargets(interval);
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(filteredTargets['pregnancy-registrations-this-month'].value).to.deep.eq({
          total: 1,
          pass: 1,
        });

        // pregReg is in this interval
        interval = { start: TEST_START - 1, end: TEST_START };
        filteredTargets = await fetchTargets(interval);
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(filteredTargets['pregnancy-registrations-this-month'].value).to.deep.eq({
          total: 0,
          pass: 0,
        });

        // 3rd-pregReg is in this interval
        interval = { start: TEST_START - 3, end: TEST_START - 2 };
        filteredTargets = await fetchTargets(interval);
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(filteredTargets['pregnancy-registrations-this-month'].value).to.deep.eq({
          total: 0,
          pass: 0,
        });

        // delete the "latest" report
        const report = await db.get('2nd-pregReg');
        await db.remove(report);
        await rulesEngine.updateEmissionsFor([patientContact._id]);

        // the latest report, 2nd-pregReg was in this interval
        interval = { start: TEST_START + 1, end: TEST_START + 2 };
        filteredTargets = await fetchTargets(interval);
        expect(filteredTargets['pregnancy-registrations-this-month'].value).to.deep.eq({
          total: 0,
          pass: 0,
        });

        // pregReg is in this interval and is now the latest report
        interval = { start: TEST_START - 1, end: TEST_START };
        filteredTargets = await fetchTargets(interval);
        expect(filteredTargets['pregnancy-registrations-this-month'].value).to.deep.eq({
          total: 1,
          pass: 1,
        });
      });

      it('targets on interval turnover only recalculates targets when interval changes', async () => {
        const targetsSaved = () => {
          const targets = [];
          db.bulkDocs.args.forEach(([docs]) => {
            if (!docs) {
              return;
            }

            if (docs && docs.docs) {
              docs = docs.docs;
            }
            docs.forEach(doc => doc._id.startsWith('target') && targets.push(doc));
          });

          return targets;
        };

        clock = sinon.useFakeTimers(TEST_START);
        const patientContact2 = Object.assign({}, patientContact, { _id: 'patient2', patient_id: 'patient_id2', });
        const pregnancyRegistrationReport2 = Object.assign(
          {},
          pregnancyRegistrationReport,
          {
            _id: 'pregReg2',
            fields: { lmp_date_8601: TEST_START, patient_id: patientContact2.patient_id },
            reported_date: TEST_START+1
          },
        );
        await db.bulkDocs([patientContact, patientContact2, pregnancyRegistrationReport, pregnancyRegistrationReport2]);
        await rulesEngine.updateEmissionsFor(['patient']);
        // we're in THE_FUTURE and our state is fresh

        sinon.spy(db, 'bulkDocs');
        sinon.spy(db, 'query');
        const targets = await fetchTargets();
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(targets[['pregnancy-registrations-this-month']].value).to.deep.eq({
          total: 2,
          pass: 2,
        });
        expect(targetsSaved().length).to.equal(1);

        const sameTargets = await fetchTargets();
        expect(db.query.callCount).to.eq(expectedQueriesForAllFreshData.length);
        expect(sameTargets).to.deep.eq(targets);
        expect(targetsSaved().length).to.equal(1);

        // fast forward one month
        clock.tick(moment(TEST_START).add(1, 'month').diff(moment(TEST_START)));
        const newTargets = await fetchTargets(calendarInterval.getCurrent());
        expect(newTargets[['pregnancy-registrations-this-month']].value).to.deep.eq({
          total: 0,
          pass: 0,
        });
        const savedTargets = targetsSaved();
        expect(savedTargets.length).to.equal(3);

        const firstTargetInterval = calendarInterval.getInterval(1, TEST_START);
        const secondTargetInterval = calendarInterval.getCurrent();
        expect(savedTargets[0].reporting_period).to.equal(moment(firstTargetInterval.end).format('YYYY-MM'));
        expect(savedTargets[1].reporting_period).to.equal(moment(firstTargetInterval.end).format('YYYY-MM'));
        expect(savedTargets[2].reporting_period).to.equal(moment(secondTargetInterval.end).format('YYYY-MM'));
      });
    });
  }

  // interface is not used within cht-core but is used by cht-conf-test-harness
  it('custom emitter', async () => {
    const expectedEmission = {
      _id: 'emitted',
      contact: patientContact,
      date: new Date().toISOString(),
    };

    const customEmitter = {
      getContact: () => class {
        constructor() {
          this.reports = [];
        }
      },
      initialize: () => {},
      startSession: () => ({
        processDocsByContact: () => {},
        dispose: () => {},
        result: () => Promise.resolve({ tasks: [expectedEmission], targets: [] }),
      }),
      isLatestNoolsSchema: () => true,
      shutdown: () => {},
    };
    
    configHashSalt++;
    const rulesSettings = engineSettings({ customEmitter, configHashSalt });

    await db.bulkDocs([patientContact]);
    
    rulesEngine = RulesEngine(db);
    await rulesEngine.rulesConfigChange(rulesSettings);  

    const taskEmissions = await rulesEngine.fetchTasksFor(['patient']);
    expect(taskEmissions).to.have.property('length', 1);
    expect(taskEmissions[0]).to.include({
      _id: `task~org.couchdb.user:username~${expectedEmission._id}~${TEST_START}`,
    });
  });
});

const triggerFacilityReminderInReadyState = async (selectBy, docs = [patientContact, pregnancyFollowupReport]) => {
  await db.bulkDocs(docs);
  sinon.spy(db, 'bulkDocs');
  sinon.spy(db, 'query');
  const tasks = await rulesEngine.fetchTasksFor(selectBy);
  expect(tasks).to.have.property('length', 1);
  expect(db.query.args.map(args => args[0])).to.deep.eq(
    selectBy ? expectedQueriesForFreshData : [...expectedQueriesForAllFreshData, 'medic-client/tasks_by_contact']
  );
  expect(db.bulkDocs.callCount).to.eq(1);
  expect(tasks[0]).to.deep.include({
    _id: `task~org.couchdb.user:username~report~pregnancy-facility-visit-reminder~anc.facility_reminder~${Date.now()}`,
    state: 'Ready',
    requester: 'patient',
    owner: 'patient',
  });
  expect(tasks).excluding('_rev').to.deep.eq(db.bulkDocs.args[0][0]);
  return tasks;
};
