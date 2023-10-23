const chai = require('chai');
const chaiExclude = require('chai-exclude');
const {
  chtDocs,
  RestorableRulesStateStore,
  simpleNoolsTemplate,
  mockEmission,
  engineSettings
} = require('./mocks');

const memdownMedic = require('@medic/memdown');
const moment = require('moment');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const sinon = require('sinon');
const rewire = require('rewire');

const pouchdbProvider = require('../src/pouchdb-provider');
const rulesEmitter = require('../src/rules-emitter');
const { assert, expect } = chai;
chai.use(chaiExclude);

const NOW = moment([1970, 1, 1, 0, 0, 50]).valueOf();
const DEFAULT_EXPIRE = 7 * 24 * 60 * 60 * 1000;

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

let clock;
let wireup;
let rulesStateStore;
const realSetTimeout = setTimeout;

describe('provider-wireup integration tests', () => {
  let provider;
  let db;
  beforeEach(async () => {
    clock = sinon.useFakeTimers(NOW);
    wireup = rewire('../src/provider-wireup');
    rulesStateStore = RestorableRulesStateStore();
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
    clock.restore();
  });

  describe('stateChangeCallback', () => {
    it('wireup of contactTaskState to pouch', async () => {
      sinon.spy(provider, 'stateChangeCallback');

      const userDoc = {};
      await wireup.initialize(provider, engineSettings(), userDoc);
      expect(db.put.args[0]).excludingEvery(['rulesConfigHash', 'targetState']).to.deep.eq([{
        _id: pouchdbProvider.RULES_STATE_DOCID,
        rulesStateStore: {
          calculatedAt: NOW,
          contactState: {},
          monthStartDate: 1,
        },
      }]);

      await wireup.fetchTasksFor(provider, ['abc']);
      await provider.stateChangeCallback.returnValues[0];
      expect(db.put.args[db.put.callCount - 1])
        .excludingEvery(['rulesConfigHash', 'targetState'])
        .excluding('_rev')
        .to.deep.eq([{
          _id: pouchdbProvider.RULES_STATE_DOCID,
          rulesStateStore: {
            contactState: {
              'abc': {
                expireAt: NOW + DEFAULT_EXPIRE,
                calculatedAt: NOW,
              },
            },
            calculatedAt: NOW,
            monthStartDate: 1,
          },
        }]);
      expect(db.put.args[0][0].rulesStateStore.rulesConfigHash)
        .to.eq(db.put.args[db.put.callCount - 1][0].rulesStateStore.rulesConfigHash);

      // simulate restarting the app. the database is the same, but the taskFetcher is uninitialized
      rulesEmitter.shutdown();
      rulesStateStore.__set__('state', undefined);

      const putCountBeforeInit = db.put.callCount;
      await wireup.initialize(provider, engineSettings(), userDoc);
      expect(db.put.callCount).to.eq(putCountBeforeInit);
      await wireup.fetchTasksFor(provider, ['abc']);
      expect(db.put.callCount).to.eq(putCountBeforeInit);
    });
  });

  it('latest schema rules are required when rules are provided', async () => {
    const rules = simpleNoolsTemplate('');
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
      // dupes don't matter here
      expect(rulesStateStore.markDirty.args).to.deep.eq([[['patient', 'headless', 'patient']]]);
    });

    it('none', async () => {
      sinon.stub(rulesStateStore, 'markDirty').resolves();
      await wireup.updateEmissionsFor(provider);
      expect(rulesStateStore.markDirty.args).to.deep.eq([[[]]]);
    });
  });

  describe('fetchTasksFor', () => {
    it('refresh headless', async () => {
      const rules = simpleNoolsTemplate('');
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
      const rules = simpleNoolsTemplate('');
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
        reportDocs: [headlessReport, chtDocs.pregnancyReport, reportConnectedByPlace],
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
            timestamp: NOW,
          }]
        }],
        userSettingsId: 'org.couchdb.user:username',
      });
    });

    it('confirm no heavy lifting when fetch fresh contact (performance)', async () => {
      sinon.spy(rulesEmitter, 'getEmissionsFor');
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = simpleNoolsTemplate('');
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
      const rules = simpleNoolsTemplate('');
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
      clock.setSystemTime(moment('2000-01-01').valueOf());
      const emission = mockChtEmission();
      sinon.stub(rulesEmitter, 'getEmissionsFor').resolves({ tasks: [emission], targets: [] });
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);

      const rules = simpleNoolsTemplate('');
      const settings = { rules, enableTargets: false };
      await wireup.initialize(provider, settings, {});
      await wireup.fetchTasksFor(provider);

      const firstDoc = getWrittenTaskDoc();
      expect(firstDoc.state).to.eq('Ready');

      // rewind one year
      clock.setSystemTime(moment('1999-01-01').valueOf());
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
      clock.setSystemTime(new Date(chtDocs.pregnancyReport.fields.t_pregnancy_follow_up_date).getTime());
      await wireup.initialize(provider, engineSettings({ enableTasks: true, enableTargets: false }), {});
      const actual = await wireup.fetchTasksFor(provider);
      expect(actual.length).to.eq(1);
    });

    it('cht yields nothing when tasks disabled', async () => {
      clock.setSystemTime(new Date(chtDocs.pregnancyReport.fields.t_pregnancy_follow_up_date).getTime());
      await wireup.initialize(provider, engineSettings({ enableTasks: false, enableTargets: true }), {});
      const actual = await wireup.fetchTasksFor(provider);
      expect(actual).to.be.empty;
    });
  });

  describe('fetchTargets', () => {
    it('cht yields targets when tasks disabled', async () => {
      await wireup.initialize(provider, engineSettings({ enableTasks: false, enableTargets: true }), {});
      const targets = await wireup.fetchTargets(provider);
      expect(targets.length).to.be.gt(1);
      const target = targets.find(target => target.id === 'active-pregnancies-1+-visits');
      expect(target.value).to.deep.eq({ pass: 1, total: 1 });
    });

    it('cht yields nothing when tasks disabled', async () => {
      await wireup.initialize(provider, engineSettings({ enableTasks: true, enableTargets: false }), {});
      const actual = await wireup.fetchTargets(provider);
      expect(actual).to.be.empty;
    });

    it('aggregate target doc is written (latest)', async () => {
      sinon.spy(provider, 'commitTargetDoc');
      await wireup.initialize(provider, engineSettings(), {}, {});
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
      await wireup.initialize(provider, engineSettings(), {}, {});
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
      const rules = simpleNoolsTemplate('');
      const settings = {
        rules,
        targets: [{
          id: 'uhc',
          passesIfGroupCount: { gte: 2 },
        }]
      };
      await wireup.initialize(provider, settings, {});

      const hhEmission = (day, family, patient, pass) => {
        const date = moment(`2000-01-${day}`);
        return {
          _id: `${family}~${date.format('YYYY-MM-DD')}`,
          contact: { _id: patient },
          type: 'uhc',
          groupBy: family,
          date: date.valueOf(),
          pass
        };
      };
      const refreshRulesEmissions = sinon.stub().resolves({
        targetEmissions: [
          hhEmission(1, 'family1', 'patient-1-1', true),
          hhEmission(2, 'family1', 'patient-1-2', true),
          hhEmission(3, 'family1', 'patient-1-1', false),

          hhEmission(3, 'family2', 'patient-2-1', true),
          hhEmission(28, 'family2', 'patient-2-1', false),

          hhEmission(4, 'family3', 'patient-3-1'),
          hhEmission(35, 'family4', 'patient-4-1'), // outside filter

          hhEmission(6, 'family6', 'patient-6-1', true),
          hhEmission(6, 'family6', 'patient-6-1', true),

          hhEmission(6, 'family7', 'patient-7-1', false),
          hhEmission(6, 'family7', 'patient-7-1', true),
          hhEmission(7, 'family7', 'patient-7-1', false),
          hhEmission(7, 'family7', 'patient-7-1', true),

          ...[1, 2, 3, 4, 5].map(day => hhEmission(day, 'family5', 'patient-5-1', true)),
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
          pass: 3, // 1, 5, and 7
          total: 6,
        },
      }]);
    });

    it('should use inclusive operator when comparing dates', async () => {
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = simpleNoolsTemplate('');
      const settings = {
        rules,
        targets: [{ id: 'uhc' }]
      };
      await wireup.initialize(provider, settings, {});

      const emission = (day, patient) => {
        const date = moment(`2000-01-${day}`);
        return {
          _id: `${patient}~${date.format('YYYY-MM-DD')}`,
          contact: { _id: patient },
          type: 'uhc',
          date: date.valueOf(),
          pass: true,
        };
      };

      const refreshRulesEmissions = sinon.stub().resolves({
        targetEmissions: [
          emission(1, 'baby1'),
          emission(2, 'baby2'),
          emission(3, 'baby3'),
          emission(31, 'baby4'),
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
          pass: 4,
          total: 4,
        },
      }]);
    });
  });

  describe('interval turnover', () => {
    const mockTargetEmission = (type, contactId, date, pass) => ({
      _id: `${contactId}_${type}_${date}`,
      type,
      contact: { _id: contactId },
      date,
      pass,
    });

    const prepareExistentState = async (state) => {
      const existing = await provider.existingRulesStateStore();
      await provider.stateChangeCallback(existing, { rulesStateStore: state });
    };

    const loadState = async (settings) => {
      const existing = await provider.existingRulesStateStore();
      const updateState = updatedState => provider.stateChangeCallback(existing, { rulesStateStore: updatedState });
      await rulesStateStore.load(existing.rulesStateStore, settings, updateState);
    };

    beforeEach(() => {
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      sinon.spy(provider, 'commitTargetDoc');
    });

    describe('during initialization', () => {
      it('should do nothing when there is no stale state', async () => {
        const rules = simpleNoolsTemplate('');
        const settings = {
          enableTargets: true,
          rules,
          targets: [{
            id: 'uhc',
          }]
        };
        await wireup.initialize(provider, settings, {});
        expect(provider.commitTargetDoc.callCount).to.equal(0);
      });

      it('should do nothing when stale state has no calculation date', async () => {
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{ id: 'uhc' }]
        };

        const staleState = {
          rulesConfigHash: rulesStateStore.__get__('hashRulesConfig')(settings),
          contactState: {},
          targetState: {},
        };
        await prepareExistentState(staleState);

        await wireup.initialize(provider, settings, {});
        expect(provider.commitTargetDoc.callCount).to.equal(0);
      });

      it('should do nothing when stale state is within same interval', async () => {
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{
            id: 'uhc',
          }],
          monthStartDate: 1,
        };

        const staleState = {
          rulesConfigHash: rulesStateStore.__get__('hashRulesConfig')(settings),
          contactState: {},
          targetState: {},
          calculatedAt: moment('2020-04-20').valueOf(),
          monthStartDate: 1,
        };
        await prepareExistentState(staleState);

        clock.setSystemTime(moment('2020-04-23').valueOf()); // 3 days later
        await wireup.initialize(provider, settings, {});
        expect(provider.commitTargetDoc.callCount).to.equal(0);
      });

      it('should update the targets doc when the state was calculated outside of the interval', async () => {
        clock.setSystemTime(moment('2020-04-28').valueOf());
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{ id: 'uhc' }],
          monthStartDate: 1,
        };

        const staleState = {
          rulesConfigHash: rulesStateStore.__get__('hashRulesConfig')(settings),
          contactState: {},
          targetState: { uhc: { emissions: {}, id: 'uhc' } },
          calculatedAt: moment('2020-04-28').valueOf(),
          monthStartDate: 1,
        };

        await prepareExistentState(staleState);
        await loadState(settings);
        const emissions = [
          mockTargetEmission('uhc', 'doc4', moment('2020-02-23').valueOf(), false), // fail outside interval
          mockTargetEmission('uhc', 'doc2', moment('2020-03-29').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc1', moment('2020-04-12').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc3', moment('2020-04-16').valueOf(), false), // fail within interval
        ];
        await rulesStateStore.storeTargetEmissions([], emissions);
        rulesStateStore.restore();

        clock.setSystemTime(moment('2020-05-02').valueOf()); // next interval
        await wireup.initialize(provider, settings, {});
        expect(provider.commitTargetDoc.callCount).to.equal(1);
        expect(provider.commitTargetDoc.args[0]).to.deep.equal([
          [{ id: 'uhc', value: { pass: 1, total: 2 } }],
          { _id: 'mock_user_id' },
          { _id: 'org.couchdb.user:username' },
          '2020-04',
          true,
        ]);
      });

      it('should work when the settings have been changed', async () => {
        clock.setSystemTime(moment('2020-04-14').valueOf());
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{
            id: 'uhc',
          }],
          monthStartDate: 15, // the target doc will be calculated using the current month start date value
        };

        // with monthStartDate = 15, and today being April 28th,
        // the current interval is Apr 15 - May 14 and the previous interval is Mar 15 - Apr 14
        const emissions = [
          mockTargetEmission('uhc', 'doc4', moment('2020-02-23').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc2', moment('2020-03-29').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc1', moment('2020-04-12').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc3', moment('2020-04-16').valueOf(), true), // passes outside interval
        ];

        const staleState = {
          rulesConfigHash: 'not the same hash!!',
          contactState: {},
          targetState: { uhc: { id: 'uhc', emissions: {}}},
          calculatedAt: moment('2020-04-14').valueOf(),
          monthStartDate: 1,
        };

        await prepareExistentState(staleState);
        await loadState(settings);
        await rulesStateStore.storeTargetEmissions([], emissions);
        rulesStateStore.restore();

        clock.setSystemTime(moment('2020-04-28').valueOf()); // next interval
        await wireup.initialize(provider, settings, {});
        expect(provider.commitTargetDoc.callCount).to.equal(1);
        expect(provider.commitTargetDoc.args[0]).to.deep.equal([
          [{ id: 'uhc', value: { pass: 2, total: 2 } }],
          { _id: 'mock_user_id' },
          { _id: 'org.couchdb.user:username' },
          '2020-04',
          true,
        ]);
      });

      it('should use inclusive operator when comparing dates (left)', async () => {
        clock.setSystemTime(moment('2020-05-28').valueOf());
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{ id: 'uhc' }],
          monthStartDate: 1,
        };

        const staleState = {
          rulesConfigHash: rulesStateStore.__get__('hashRulesConfig')(settings),
          contactState: {},
          targetState: { uhc: { emissions: {}, id: 'uhc' } },
          calculatedAt: moment('2020-05-28').valueOf(),
          monthStartDate: 1,
        };

        await prepareExistentState(staleState);
        await loadState(settings);
        const emissions = [
          mockTargetEmission('uhc', 'doc4', moment('2020-02-23').valueOf(), true),
          mockTargetEmission('uhc', 'doc2', moment('2020-04-30 23:59:59:999').valueOf(), true),
          mockTargetEmission('uhc', 'doc1', moment('2020-05-01 00:00:00:000').valueOf(), true),
          mockTargetEmission('uhc', 'doc3', moment('2020-05-06').valueOf(), true),
        ];
        await rulesStateStore.storeTargetEmissions([], emissions);
        rulesStateStore.restore();

        clock.setSystemTime(moment('2020-06-02').valueOf()); // next interval
        await wireup.initialize(provider, settings, {});
        expect(provider.commitTargetDoc.callCount).to.equal(1);
        expect(provider.commitTargetDoc.args[0]).to.deep.equal([
          [{ id: 'uhc', value: { pass: 2, total: 2 } }],
          { _id: 'mock_user_id' },
          { _id: 'org.couchdb.user:username' },
          '2020-05',
          true,
        ]);
      });

      it('should use inclusive operator when comparing dates (right)', async () => {
        clock.setSystemTime(moment('2020-05-28').valueOf());
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{ id: 'uhc' }],
          monthStartDate: 1,
        };

        const staleState = {
          rulesConfigHash: rulesStateStore.__get__('hashRulesConfig')(settings),
          contactState: {},
          targetState: { uhc: { emissions: {}, id: 'uhc' } },
          calculatedAt: moment('2020-05-28').valueOf(),
          monthStartDate: 1,
        };

        await prepareExistentState(staleState);
        await loadState(settings);
        const emissions = [
          mockTargetEmission('uhc', 'doc4', moment('2020-02-23').valueOf(), true),
          mockTargetEmission('uhc', 'doc3', moment('2020-05-06').valueOf(), true),
          mockTargetEmission('uhc', 'doc3', moment('2020-05-31 23:59:59').valueOf(), true),
          mockTargetEmission('uhc', 'doc3', moment('2020-06-01 00:00:00').valueOf(), true),
          mockTargetEmission('uhc', 'doc3', moment('2020-06-01 00:00:00').valueOf(), true),
        ];
        await rulesStateStore.storeTargetEmissions([], emissions);
        rulesStateStore.restore();

        clock.setSystemTime(moment('2020-06-02').valueOf()); // next interval
        await wireup.initialize(provider, settings, {});
        expect(provider.commitTargetDoc.callCount).to.equal(1);
        expect(provider.commitTargetDoc.args[0]).to.deep.equal([
          [{ id: 'uhc', value: { pass: 2, total: 2 } }],
          { _id: 'mock_user_id' },
          { _id: 'org.couchdb.user:username' },
          '2020-05',
          true,
        ]);
      });
    });

    describe('during regular use', () => {
      it('should do nothing when in same interval', async () => {
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{
            id: 'uhc',
          }],
          monthStartDate: 1,
        };

        clock.setSystemTime(moment('2020-04-23').valueOf());
        await wireup.initialize(provider, settings, {});
        expect(provider.commitTargetDoc.callCount).to.equal(0);

        const emissions = [
          mockTargetEmission('uhc', 'doc4', moment('2020-02-23').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc2', moment('2020-03-29').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc1', moment('2020-04-12').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc3', moment('2020-04-16').valueOf(), true), // passes within interval
        ];
        const refreshRulesEmissions = sinon.stub().resolves({ targetEmissions: emissions });
        const withMockRefresher = wireup.__with__({ refreshRulesEmissions });

        await withMockRefresher(() => wireup.fetchTasksFor(provider));
        expect(provider.commitTargetDoc.callCount).to.equal(0);
        const currentInterval = { start: moment('2020-04-01').valueOf(), end: moment('2020-04-30').valueOf() };
        await withMockRefresher(() => wireup.fetchTargets(provider, currentInterval));

        // we didn't have a target doc before, so this is creating it for the first time
        expect(provider.commitTargetDoc.callCount).to.equal(1);
        expect(provider.commitTargetDoc.args[0][3]).to.equal('2020-04');
        expect(provider.commitTargetDoc.args[0][0]).to.deep.equal([{ id: 'uhc', value: { pass: 2, total: 2 }}]);
      });

      it('should update targets when in new interval when refreshing tasks', async () => {
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{
            id: 'uhc',
          }],
          monthStartDate: 1,
        };

        clock.setSystemTime(moment('2020-04-30 23:00:00').valueOf());
        await wireup.initialize(provider, settings, {});

        const emissions = [
          mockTargetEmission('uhc', 'doc4', moment('2020-02-23').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc2', moment('2020-03-29').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc1', moment('2020-04-12').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc3', moment('2020-04-14').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc5', moment('2020-05-05').valueOf(), true), // passes outside interval
        ];

        const refreshRulesEmissions = sinon.stub().resolves({ targetEmissions: emissions });
        const withMockRefresher = wireup.__with__({ refreshRulesEmissions });

        expect(provider.commitTargetDoc.callCount).to.equal(0);
        await withMockRefresher(() => wireup.fetchTasksFor(provider));
        expect(provider.commitTargetDoc.callCount).to.equal(0);

        clock.tick(5 * 60 * 60 * 1000); // 6 hours, it's now 2020-05-01 04:00:00
        await withMockRefresher(() => wireup.fetchTasksFor(provider));
        expect(provider.commitTargetDoc.callCount).to.equal(1);
        expect(provider.commitTargetDoc.args[0][3]).to.equal('2020-04');
        expect(provider.commitTargetDoc.args[0][0]).to.deep.equal([{ id: 'uhc', value: { pass: 2, total: 2 }}]);
      });

      it('should update targets when in new interval when refreshing targets', async () => {
        const rules = simpleNoolsTemplate('');
        const settings = {
          rules,
          enableTargets: true,
          targets: [{
            id: 'uhc',
          }],
          monthStartDate: 1,
        };

        clock.setSystemTime(moment('2020-04-30 23:00:00').valueOf());
        await wireup.initialize(provider, settings, {});

        const emissionsBefore = [
          mockTargetEmission('uhc', 'doc4', moment('2020-02-23').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc2', moment('2020-03-29').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc1', moment('2020-04-12').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc3', moment('2020-04-14').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc5', moment('2020-05-05').valueOf(), true), // passes outside interval
        ];

        // simulate that we have a target with date: now (doc3) and that gets counted in both targets
        const emissionsAfter = [
          mockTargetEmission('uhc', 'doc4', moment('2020-02-23').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc2', moment('2020-03-29').valueOf(), true), // passes outside interval
          mockTargetEmission('uhc', 'doc1', moment('2020-04-12').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc3', moment('2020-05-05').valueOf(), true), // passes within interval
          mockTargetEmission('uhc', 'doc5', moment('2020-05-05').valueOf(), true), // passes outside interval
        ];

        const refreshRulesEmissions = sinon.stub()
          .onCall(0).resolves({ targetEmissions: emissionsBefore })
          .onCall(1).resolves({ targetEmissions: emissionsAfter });

        const withMockRefresher = wireup.__with__({ refreshRulesEmissions });
        // make sure our state has been "calculated" at least once!
        await withMockRefresher(() => wireup.fetchTasksFor(provider));

        expect(provider.commitTargetDoc.callCount).to.equal(0);

        clock.tick(5 * 60 * 60 * 1000); // 6 hours, it's now 2020-05-01 04:00:00
        const currentInterval = { start: moment('2020-05-01').valueOf(), end: moment('2020-05-31').valueOf() };
        await withMockRefresher(() => wireup.fetchTargets(provider, currentInterval));

        expect(provider.commitTargetDoc.callCount).to.equal(2);
        expect(provider.commitTargetDoc.args[0][3]).to.equal('2020-04');
        expect(provider.commitTargetDoc.args[0][0]).to.deep.equal([{ id: 'uhc', value: { pass: 2, total: 2 }}]);
        expect(provider.commitTargetDoc.args[1][3]).to.equal('2020-05');
        expect(provider.commitTargetDoc.args[1][0]).to.deep.equal([{ id: 'uhc', value: { pass: 2, total: 2 }}]);
      });
    });
  });

  describe('refresh queue', () => {
    const nextTick = () => new Promise(resolve => realSetTimeout(resolve));

    it('should not process more than one rule freshness thread at once', async () => {
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      sinon.stub(provider, 'allTaskData').resolves({
        contactDocs: [],
        reportDocs: [],
      });
      sinon.stub(rulesStateStore, 'storeTargetEmissions').resolves();
      sinon.stub(rulesStateStore, 'aggregateStoredTargetEmissions').returns([]);
      sinon.stub(provider, 'commitTaskDocs').resolves();
      sinon.stub(provider, 'allTasks').resolves([]);
      sinon.stub(provider, 'commitTargetDoc').resolves();

      const settings = { rules: simpleNoolsTemplate(''), enableTargets: true };
      await wireup.initialize(provider, settings, {});

      const promiseQueue = [];
      const refreshRulesEmissions = sinon.stub().callsFake(() => new Promise(resolve => {
        promiseQueue.push(resolve);
      }));
      const dummyEmissions = { targetEmissions: [],  taskTransforms: [] };
      const withMockRefresher = wireup.__with__({ refreshRulesEmissions });

      const generateListeners = () => ({ queued: sinon.stub(), running: sinon.stub() });
      const listeners = [];

      await withMockRefresher(async () => {
        listeners.push(generateListeners());
        wireup
          .fetchTasksFor(provider)
          .on('queued', listeners.slice(-1)[0].queued)
          .on('running', listeners.slice(-1)[0].running);

        listeners.push(generateListeners());
        wireup
          .fetchTasksFor(provider)
          .on('queued', listeners.slice(-1)[0].queued)
          .on('running', listeners.slice(-1)[0].running);

        listeners.push(generateListeners());
        wireup
          .fetchTargets(provider)
          .on('queued', listeners.slice(-1)[0].queued)
          .on('running', listeners.slice(-1)[0].running);

        listeners.push(generateListeners());
        wireup
          .fetchTargets(provider)
          .on('queued', listeners.slice(-1)[0].queued)
          .on('running', listeners.slice(-1)[0].running);

        chai.expect(refreshRulesEmissions.callCount).to.equal(0);
        await nextTick();

        // all queued, 1st is running
        chai.expect(listeners[0].queued.callCount).to.equal(1);
        chai.expect(listeners[0].running.callCount).to.equal(1);

        chai.expect(listeners[1].queued.callCount).to.equal(1);
        chai.expect(listeners[1].running.callCount).to.equal(0);

        chai.expect(listeners[2].queued.callCount).to.equal(1);
        chai.expect(listeners[2].running.callCount).to.equal(0);

        chai.expect(listeners[3].queued.callCount).to.equal(1);
        chai.expect(listeners[3].running.callCount).to.equal(0);

        chai.expect(refreshRulesEmissions.callCount).to.equal(1);
        clock.tick(10000);
        chai.expect(refreshRulesEmissions.callCount).to.equal(1);

        promiseQueue.pop()(dummyEmissions);
        await nextTick();
        chai.expect(refreshRulesEmissions.callCount).to.equal(2);

        // all queued, 1st and 2nd running
        chai.expect(listeners[0].queued.callCount).to.equal(1);
        chai.expect(listeners[0].running.callCount).to.equal(1);

        chai.expect(listeners[1].queued.callCount).to.equal(1);
        chai.expect(listeners[1].running.callCount).to.equal(1);

        chai.expect(listeners[2].queued.callCount).to.equal(1);
        chai.expect(listeners[2].running.callCount).to.equal(0);

        chai.expect(listeners[3].queued.callCount).to.equal(1);
        chai.expect(listeners[3].running.callCount).to.equal(0);


        await nextTick();
        await nextTick();

        chai.expect(refreshRulesEmissions.callCount).to.equal(2);
        clock.tick(10000);
        chai.expect(refreshRulesEmissions.callCount).to.equal(2);

        promiseQueue.pop()(dummyEmissions);
        await nextTick();
        chai.expect(refreshRulesEmissions.callCount).to.equal(3);

        // all queued, 1st, 2nd, 3rd running
        chai.expect(listeners[0].queued.callCount).to.equal(1);
        chai.expect(listeners[0].running.callCount).to.equal(1);

        chai.expect(listeners[1].queued.callCount).to.equal(1);
        chai.expect(listeners[1].running.callCount).to.equal(1);

        chai.expect(listeners[2].queued.callCount).to.equal(1);
        chai.expect(listeners[2].running.callCount).to.equal(1);

        chai.expect(listeners[3].queued.callCount).to.equal(1);
        chai.expect(listeners[3].running.callCount).to.equal(0);

        promiseQueue.pop()(dummyEmissions);
        await nextTick();
        chai.expect(refreshRulesEmissions.callCount).to.equal(4);

        // all queued, all running
        chai.expect(listeners[0].queued.callCount).to.equal(1);
        chai.expect(listeners[0].running.callCount).to.equal(1);

        chai.expect(listeners[1].queued.callCount).to.equal(1);
        chai.expect(listeners[1].running.callCount).to.equal(1);

        chai.expect(listeners[2].queued.callCount).to.equal(1);
        chai.expect(listeners[2].running.callCount).to.equal(1);

        chai.expect(listeners[3].queued.callCount).to.equal(1);
        chai.expect(listeners[3].running.callCount).to.equal(1);
      });
    });

    it('should provide `on` property and emit nothing when actions are disabled', async () => {
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);

      const settings = { rules: simpleNoolsTemplate(''), enableTargets: false, enableTasks: false };
      await wireup.initialize(provider, settings, {});
      const generateListeners = () => ({ queued: sinon.stub(), running: sinon.stub() });
      const listeners = [];
      listeners.push(generateListeners());
      wireup
        .fetchTasksFor(provider)
        .on('queued', listeners.slice(-1)[0].queued)
        .on('running', listeners.slice(-1)[0].running);
      listeners.push(generateListeners());
      wireup
        .fetchTasksFor(provider)
        .on('queued', listeners.slice(-1)[0].queued)
        .on('running', listeners.slice(-1)[0].running);

      listeners.push(generateListeners());
      wireup
        .fetchTargets(provider)
        .on('queued', listeners.slice(-1)[0].queued)
        .on('running', listeners.slice(-1)[0].running);

      listeners.push(generateListeners());
      wireup
        .fetchTargets(provider)
        .on('queued', listeners.slice(-1)[0].queued)
        .on('running', listeners.slice(-1)[0].running);

      await nextTick();

      // none queued, all running
      chai.expect(listeners[0].queued.callCount).to.equal(0);
      chai.expect(listeners[0].running.callCount).to.equal(0);

      chai.expect(listeners[1].queued.callCount).to.equal(0);
      chai.expect(listeners[1].running.callCount).to.equal(0);

      chai.expect(listeners[2].queued.callCount).to.equal(0);
      chai.expect(listeners[2].running.callCount).to.equal(0);

      chai.expect(listeners[3].queued.callCount).to.equal(0);
      chai.expect(listeners[3].running.callCount).to.equal(0);
    });
  });

  describe('fetchTasksBreakdown', () => {
    beforeEach(async () => {
      await db.bulkDocs([
        {
          _id: 'cancelledTask1',
          type: 'task',
          owner: 'patient',
          state: 'Cancelled',
        },
        {
          _id: 'cancelledTask2',
          type: 'task',
          owner: 'patient',
          state: 'Cancelled',
        },
        {
          _id: 'completedTask',
          type: 'task',
          requester: 'patient',
          owner: 'patient',
          state: 'Completed',
        },
        {
          _id: 'readyTask1',
          type: 'task',
          requester: 'patient',
          owner: 'patient',
          state: 'Ready',
        },
        {
          _id: 'readyTask2',
          type: 'task',
          requester: 'patient',
          owner: 'patient',
          state: 'Ready',
        },
        {
          _id: 'draftTask1',
          type: 'task',
          requester: 'patient',
          owner: 'patient',
          state: 'Draft',
        },
        {
          _id: 'draftTask2',
          type: 'task',
          requester: 'patient',
          owner: 'patient',
          state: 'Draft',
        },
        {
          _id: 'draftTaskHeadless',
          type: 'task',
          owner: 'headless',
          state: 'Draft',
        },
        {
          _id: 'readyTaskHeadless',
          type: 'task',
          owner: 'headless',
          state: 'Ready',
        },
        {
          _id: 'failedTaskHeadless',
          type: 'task',
          owner: 'headless',
          state: 'Failed',
        },
      ]);
    });

    it('should return a zero sum object if tasks are not enabled', async () => {
      sinon.stub(rulesEmitter, 'isEnabled').returns(false);
      sinon.stub(rulesEmitter, 'initialize').returns(true);

      expect(await wireup.fetchTasksBreakdown()).to.deep.equal({
        Cancelled: 0,
        Ready: 0,
        Draft: 0,
        Completed: 0,
        Failed: 0,
      });

      rulesEmitter.isEnabled.returns(true);
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      await wireup.initialize(provider, { enableTasks: false });

      expect(await wireup.fetchTasksBreakdown()).to.deep.equal({
        Cancelled: 0,
        Ready: 0,
        Draft: 0,
        Completed: 0,
        Failed: 0,
      });

      expect(db.query.callCount).to.equal(0);
    });

    it('should get tasks breakdown by owner when contact ids are provided', async () => {
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = simpleNoolsTemplate('');
      const settings = { rules, enableTasks: true };
      await wireup.initialize(provider, settings, {});
      expect(await wireup.fetchTasksBreakdown(provider, ['patient'])).to.deep.equal({
        Cancelled: 2,
        Ready: 2,
        Draft: 2,
        Completed: 1,
        Failed: 0,
      });
    });

    it('should get all tasks breakdown when no contact ids are provided', async () => {
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = simpleNoolsTemplate('');
      const settings = { rules, enableTasks: true };
      await wireup.initialize(provider, settings, {});
      expect(await wireup.fetchTasksBreakdown(provider)).to.deep.equal({
        Cancelled: 2,
        Ready: 3,
        Draft: 3,
        Completed: 1,
        Failed: 1,
      });
    });
  });
});
