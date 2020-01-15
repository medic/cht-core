const chai = require('chai');
const chaiExclude = require('chai-exclude');
const { chtDocs, RestorableRulesStateStore, noolsPartnerTemplate, mockEmission, chtRulesSettings } = require('./mocks');
const memdownMedic = require('@medic/memdown');
const moment = require('moment');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const sinon = require('sinon');
const rewire = require('rewire');

const pouchdbProvider = require('../src/pouchdb-provider');
const rulesEmitter = require('../src/rules-emitter');
const wireup = rewire('../src/provider-wireup');
const { assert, expect } = chai;
chai.use(chaiExclude);

const rulesStateStore = RestorableRulesStateStore();
const NOW = 50000;

const reportConnectedByPlace = {
  _id: 'reportByPlace',
  type: 'data_record',
  form: 'form',
  place_id: 'patient',
  reported_date: 2000,
};
const headlessReport = {
  _id: 'headlessReport',
  type: 'data_record',
  form: 'form',
  patient_id: 'headless',
  reported_date: 1000,
};
const taskOwnedByChtContact = {
  _id: 'taskOwnedBy',
  type: 'task',
  owner: 'patient',
  emission: {},
};
const taskRequestedByChtContact = {
  _id: 'taskRequestedBy',
  type: 'task',
  requester: 'patient',
  emission: {},
};
const headlessTask = {
  _id: 'headlessTask',
  type: 'task',
  requester: 'headless',
  owner: 'headless',
  emission: {},
};

const fixtures = [
  chtDocs.contact,

  chtDocs.pregnancyReport,
  headlessReport,
  reportConnectedByPlace,

  taskOwnedByChtContact,
  taskRequestedByChtContact,
  headlessTask,
];

describe('provider-wireup integration tests', () => {
  let provider;
  let db;
  beforeEach(async () => {
    sinon.useFakeTimers(NOW);
    sinon.stub(rulesStateStore, 'currentUserContact').returns({ _id: 'mock_user_id' });
    sinon.stub(rulesStateStore, 'currentUserSettings').returns({ _id: 'org.couchdb.user:username' });
    wireup.__set__('rulesStateStore', rulesStateStore);

    db = await memdownMedic('../..');
    await db.bulkDocs(fixtures);

    sinon.spy(db, 'put');
    sinon.spy(db, 'query');

    provider = pouchdbProvider(db);
  });
  afterEach(() => {
    rulesStateStore.restore();
    sinon.restore();
    rulesEmitter.shutdown();
  });

  describe('stateChangeCallback', () => {
    it('wireup of contactTaskState to pouch', async () => {
      sinon.spy(provider, 'stateChangeCallback');

      const userDoc = {};
      await wireup.initialize(provider, chtRulesSettings(), userDoc);
      expect(db.put.args[0]).excludingEvery(['rulesConfigHash', 'targetState']).to.deep.eq([{
        _id: pouchdbProvider.RULES_STATE_DOCID,
        rulesStateStore: {
          contactState: {},
        },
      }]);

      await wireup.fetchTasksFor(provider, ['abc']);
      await provider.stateChangeCallback.returnValues[0];
      expect(db.put.args[db.put.callCount - 1]).excludingEvery(['rulesConfigHash', 'targetState']).excluding('_rev').to.deep.eq([{
        _id: pouchdbProvider.RULES_STATE_DOCID,
        rulesStateStore: {
          contactState: {
            'abc': {
              calculatedAt: NOW,
            },
          },
        },
      }]);
      expect(db.put.args[0][0].rulesStateStore.rulesConfigHash).to.eq(db.put.args[db.put.callCount - 1][0].rulesStateStore.rulesConfigHash);

      // simulate restarting the app. the database is the same, but the taskFetcher is uninitialized
      rulesEmitter.shutdown();
      rulesStateStore.__set__('state', undefined);

      const putCountBeforeInit = db.put.callCount;
      await wireup.initialize(provider, chtRulesSettings(), userDoc);
      expect(db.put.callCount).to.eq(putCountBeforeInit);
      await wireup.fetchTasksFor(provider, ['abc']);
      expect(db.put.callCount).to.eq(putCountBeforeInit);
    });
  });

  it('latest schema rules are required when rules are provided', async () => {
    const rules = noolsPartnerTemplate('');
    const settings = { rules };
    try {
      await wireup.initialize(provider, settings, {});
      assert.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('schema');
    }
  });

  describe('updateEmissionsFor', () => {
    it('empty array', async () => {
      sinon.stub(rulesStateStore, 'markDirty').resolves();
      await wireup.updateEmissionsFor(provider, []);
      expect(rulesStateStore.markDirty.args).to.deep.eq([[[]]]);
    });

    it('contact id', async () => {
      sinon.stub(rulesStateStore, 'markDirty').resolves();
      await wireup.updateEmissionsFor(provider, chtDocs.contact._id);
      expect(rulesStateStore.markDirty.args).to.deep.eq([[['patient']]]);
    });

    it('patient id', async () => {
      sinon.stub(rulesStateStore, 'markDirty').resolves();
      await wireup.updateEmissionsFor(provider, [chtDocs.contact.patient_id]);
      expect(rulesStateStore.markDirty.args).to.deep.eq([[['patient']]]);
    });

    it('unknown subject id still gets marked (headless scenario)', async () => {
      sinon.stub(rulesStateStore, 'markDirty').resolves();
      await wireup.updateEmissionsFor(provider, 'headless');
      expect(rulesStateStore.markDirty.args).to.deep.eq([[['headless']]]);
    });

    it('many', async () => {
      sinon.stub(rulesStateStore, 'markDirty').resolves();
      await wireup.updateEmissionsFor(provider, ['headless', 'patient', 'patient_id']);
      expect(rulesStateStore.markDirty.args).to.deep.eq([[['patient', 'headless', 'patient']]]); // dupes don't matter here
    });
  });

  describe('fetchTasksFor', () => {
    it('refresh headless', async () => {
      const rules = noolsPartnerTemplate('', { });
      const settings = { rules };
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      sinon.spy(db, 'bulkDocs');
      await wireup.initialize(provider, settings, {});

      const refreshRulesEmissions = sinon.stub().resolves({
        targetEmissions: [],
        taskTransforms: [],
      });
      await wireup.__with__({ refreshRulesEmissions })(() => wireup.fetchTasksFor(provider, ['headless']));
      expect(refreshRulesEmissions.callCount).to.eq(1);
      expect(refreshRulesEmissions.args[0][0]).excludingEvery('_rev').to.deep.eq({
        contactDocs: [],
        reportDocs: [headlessReport],
        taskDocs: [headlessTask],
        userSettingsId: 'org.couchdb.user:username',
      });

      expect(db.bulkDocs.callCount).to.eq(1);
      expect(db.bulkDocs.args[0][0][0]).to.nested.include({
        _id: 'headlessTask',
        type: 'task',
        state: 'Cancelled', // invalid due to no emission data
      });
    });

    it('tasks tab includes headless reports and tasks', async () => {
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = noolsPartnerTemplate('', { });
      const settings = { rules };
      await wireup.initialize(provider, settings, {});

      const refreshRulesEmissions = sinon.stub().resolves({
        targetEmissions: [],
        taskTransforms: [],
      });
      const withMockRefresher = wireup.__with__({ refreshRulesEmissions });

      await withMockRefresher(() => wireup.fetchTasksFor(provider));
      expect(refreshRulesEmissions.callCount).to.eq(1);
      expect(refreshRulesEmissions.args[0][0]).excludingEvery('_rev').to.deep.eq({
        contactDocs: [chtDocs.contact],
        reportDocs: [headlessReport, reportConnectedByPlace, chtDocs.pregnancyReport],
        taskDocs: [headlessTask, taskRequestedByChtContact],
        userSettingsId: 'org.couchdb.user:username',
      });

      expect(rulesStateStore.hasAllContacts()).to.be.true;
      await withMockRefresher(() => wireup.fetchTasksFor(provider));
      expect(refreshRulesEmissions.callCount).to.eq(2);
      expect(refreshRulesEmissions.args[1][0]).excludingEvery('_rev').to.deep.eq({});

      rulesStateStore.markDirty(['headless']);
      await withMockRefresher(() => wireup.fetchTasksFor(provider));
      expect(refreshRulesEmissions.callCount).to.eq(3);
      expect(refreshRulesEmissions.args[2][0]).excludingEvery('_rev').to.deep.eq({
        contactDocs: [],
        reportDocs: [headlessReport],
        taskDocs: [{
          _id: 'headlessTask',
          type: 'task',
          owner: 'headless',
          requester: 'headless',
          state: 'Cancelled',
          stateReason: 'invalid',
          emission: {},
          stateHistory: [{
            state: 'Cancelled',
            timestamp: 50000,
          }]
        }],
        userSettingsId: 'org.couchdb.user:username',
      });
    });

    it('confirm no heavy lifting when fetch fresh contact (performance)', async () => {
      sinon.spy(rulesEmitter, 'getEmissionsFor');
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = noolsPartnerTemplate('', { });
      const settings = { rules };
      await wireup.initialize(provider, settings, {});
      await rulesStateStore.markFresh(Date.now(), 'fresh');

      const actual = await wireup.fetchTasksFor(provider, ['fresh']);
      expect(actual).to.be.empty;
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(db.query.callCount).to.eq(1);
    });

    /*
    This interaction with pouchdb is important as it is the difference of 30seconds vs 0.5second load times
    I've broken this a few times when refactoring, so adding this to ensure it stays
    */
    it('tasks tab does not provide a list of keys to tasks view (performance)', async () => {
      sinon.spy(rulesEmitter, 'getEmissionsFor');
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = noolsPartnerTemplate('', { });
      const settings = { rules };
      await wireup.initialize(provider, settings, {});
      await rulesStateStore.markAllFresh(Date.now(), ['dirty']);
      await rulesStateStore.markDirty(Date.now(), ['dirty']);
      const actual = await wireup.fetchTasksFor(provider);
      expect(actual).to.be.empty;
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(1);
      expect(db.query.callCount).to.eq(3);
      expect(db.query.args[2][0]).to.eq('medic-client/tasks_by_contact');
      expect(db.query.args[2][1]).to.not.have.property('keys');
    });

    it('user rewinds system clock', async () => {
      const getWrittenTaskDoc = () => {
        const expectedId = `task~org.couchdb.user:username~${emission._id}~${Date.now()}`;
        const committedDocs = db.bulkDocs.args.reduce((agg, arg) => [...agg, ...arg[0]], []);
        const doc = committedDocs.find(doc => doc._id === expectedId);
        expect(doc).to.not.be.undefined;
        return doc;
      };

      const mockChtEmission = () => mockEmission(0, {
        contact: { _id: chtDocs.contact._id },
        doc: {
          contact: { _id: chtDocs.contact._id },
        },
      });

      sinon.spy(db, 'bulkDocs');
      sinon.useFakeTimers(moment('2000-01-01').valueOf());
      const emission = mockChtEmission();
      sinon.stub(rulesEmitter, 'getEmissionsFor').resolves({ tasks: [emission], targets: [] });
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);

      const rules = noolsPartnerTemplate('', { });
      const settings = { rules };
      await wireup.initialize(provider, settings, {});
      await wireup.fetchTasksFor(provider);

      const firstDoc = getWrittenTaskDoc();
      expect(firstDoc.state).to.eq('Ready');

      // rewind one year
      sinon.useFakeTimers(moment('1999-01-01').valueOf());
      db.bulkDocs.restore();
      sinon.spy(db, 'bulkDocs');
      const earlierEmission = mockChtEmission();
      rulesEmitter.getEmissionsFor.resolves({ tasks: [earlierEmission], targets: [] });
      const displayed = await wireup.fetchTasksFor(provider);

      const secondDoc = getWrittenTaskDoc();
      expect(firstDoc._id).to.not.eq(secondDoc._id); // a new doc is created, the "future" doc is not used
      expect(secondDoc.state).to.eq('Ready'); // that doc is the only thing displayed
      expect(displayed).excludingEvery(['_rev', 'name']).to.deep.eq([secondDoc]);

      const updatedFirstDoc = await db.get(firstDoc._id);
      expect(updatedFirstDoc.state).to.eq('Cancelled'); // the "future" doc gets moved to a cancelled state
    });

    it('cht yields task when targets disabled', async () => {
      sinon.useFakeTimers(new Date(chtDocs.pregnancyReport.fields.t_pregnancy_follow_up_date).getTime());
      await wireup.initialize(provider, chtRulesSettings({ enableTasks: true, enableTargets: false }), {});
      const actual = await wireup.fetchTasksFor(provider);
      expect(actual.length).to.eq(1);
    });

    it('cht yields nothing when tasks disabled', async () => {
      sinon.useFakeTimers(new Date(chtDocs.pregnancyReport.fields.t_pregnancy_follow_up_date).getTime());
      await wireup.initialize(provider, chtRulesSettings({ enableTasks: false, enableTargets: true }), {});
      const actual = await wireup.fetchTasksFor(provider);
      expect(actual).to.be.empty;
    });
  });

  describe('fetchTargets', () => {
    it('cht yields targets when tasks disabled', async () => {
      await wireup.initialize(provider, chtRulesSettings({ enableTasks: false, enableTargets: true }), {});
      const targets = await wireup.fetchTargets(provider);
      expect(targets.length).to.be.gt(1);
      const target = targets.find(target => target.id === 'active-pregnancies-1+-visits');
      expect(target.value).to.deep.eq({ pass: 1, total: 1 });
    });

    it('cht yields nothing when tasks disabled', async () => {
      await wireup.initialize(provider, chtRulesSettings({ enableTasks: true, enableTargets: false }), {});
      const actual = await wireup.fetchTargets(provider);
      expect(actual).to.be.empty;
    });

    it('aggregate target doc is written (latest)', async () => {
      sinon.spy(provider, 'commitTargetDoc');
      await wireup.initialize(provider, chtRulesSettings(), {}, {});
      const actual = await wireup.fetchTargets(provider);
      expect(actual.length).to.be.gt(1);

      expect(provider.commitTargetDoc.callCount).to.eq(1);
      await provider.commitTargetDoc.returnValues[0];

      const writtenDoc = await db.get('target~latest~mock_user_id~org.couchdb.user:username');
      expect(writtenDoc).excluding(['targets', '_rev']).to.deep.eq({
        _id: 'target~latest~mock_user_id~org.couchdb.user:username',
        type: 'target',
        updated_date: moment(NOW).startOf('day').valueOf(),
        owner: 'mock_user_id',
        user: 'org.couchdb.user:username',
        reporting_period: 'latest',
      });
      expect(writtenDoc.targets[0]).to.deep.eq({
        id: 'deaths-this-month',
        value: {
          pass: 0,
          total: 0,
        },
      });
    });

    it('aggregate target doc is written (date)', async () => {
      sinon.spy(provider, 'commitTargetDoc');
      await wireup.initialize(provider, chtRulesSettings(), {}, {});
      const interval = { start: 1, end: 1000 };
      const actual = await wireup.fetchTargets(provider, interval);
      expect(actual.length).to.be.gt(1);

      expect(provider.commitTargetDoc.callCount).to.eq(1);
      await provider.commitTargetDoc.returnValues[0];

      const expectedId = `target~${moment(1000).format('YYYY-MM')}~mock_user_id~org.couchdb.user:username`;
      const writtenDoc = await db.get(expectedId);
      expect(writtenDoc).excluding(['targets', '_rev']).to.deep.eq({
        _id: expectedId,
        type: 'target',
        updated_date: moment(NOW).startOf('day').valueOf(),
        owner: 'mock_user_id',
        user: 'org.couchdb.user:username',
        reporting_period: moment(1000).format('YYYY-MM'),
      });
      expect(writtenDoc.targets[0]).to.deep.eq({
        id: 'deaths-this-month',
        value: {
          pass: 0,
          total: 0,
        },
      });
    });

    it('uhc - % families with 2 hh visits/month', async () => {
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = noolsPartnerTemplate('', { });
      const settings = {
        rules,
        targets: [{
          id: 'uhc',
          passesIfGroupCount: { gte: 2 },
        }]
      };
      await wireup.initialize(provider, settings, {});

      const hhEmission = (day, family, patient) => {
        const date = moment(`2000-01-${day}`);
        return {
          _id: `${family}~${date.format('YYYY-MM-DD')}`,
          contact: { _id: patient },
          type: 'uhc',
          groupBy: family,
          date: date.valueOf()
        };
      };
      const refreshRulesEmissions = sinon.stub().resolves({
        targetEmissions: [
          hhEmission(1, 'family1', 'patient-1-1'),
          hhEmission(1, 'family1', 'patient-1-2'), // redundant
          hhEmission(3, 'family1', 'patient-1-1'),

          hhEmission(3, 'family2', 'patient-2-1'),
          hhEmission(28, 'family2', 'patient-2-1'),

          hhEmission(4, 'family3', 'patient-3-1'),
          hhEmission(35, 'family4', 'patient-4-1'), // outside filter

          ...[1,2,3,4,5].map(day => hhEmission(day, 'family5', 'patient-5-1')),
        ],
      });
      const withMockRefresher = wireup.__with__({ refreshRulesEmissions });

      const interval = {
        start: moment('2000-01-01').valueOf(),
        end: moment('2000-01-31').valueOf(),
      };

      const targets = await withMockRefresher(() => wireup.fetchTargets(provider, interval));
      expect(refreshRulesEmissions.callCount).to.eq(1);
      expect(targets).to.deep.eq([{
        id: 'uhc',
        value: {
          pass: 2, // 1 and 5
          total: 4, // not 4
        },
      }]);
    });
  });
});
