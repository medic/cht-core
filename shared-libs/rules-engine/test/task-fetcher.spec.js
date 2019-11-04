const chai = require('chai');
const chaiExclude = require('chai-exclude');
const { chtDocs, RestorableContactStateStore, noolsPartnerTemplate } = require('./mocks');
const memdownMedic = require('@medic/memdown');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-memory'));
const sinon = require('sinon');
const rewire = require('rewire');

const rulesEmitter = require('../src/rules-emitter');
const taskFetcher = rewire('../src/task-fetcher');
const settingsDoc = require('../../../config/default/app_settings.json');
const { assert, expect } = chai;
chai.use(chaiExclude);

const contactStateStore = RestorableContactStateStore();
const NOW = 50000;

describe('task-fetcher', () => {
  let db;
  beforeEach(() => {
    sinon.useFakeTimers(NOW);
    sinon.stub(contactStateStore, 'currentUser').returns({ _id: 'mock_user_id' });
    taskFetcher.__set__('contactStateStore', contactStateStore);
    rulesEmitter.shutdown();
  });
  afterEach(() => {
    contactStateStore.restore();
    sinon.restore();
  });

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
  };
  const taskRequestedByChtContact = {
    _id: 'taskReqiestedBy',
    type: 'task',
    requester: 'patient',
  };
  const headlessTask = {
    _id: 'headlessTask',
    type: 'task',
    requester: 'headless',
    owner: 'headless',
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

  beforeEach(async () => {
    db = await memdownMedic('../..');
    await db.bulkDocs(fixtures);

    sinon.spy(db, 'put');
    sinon.spy(db, 'query');
  });

  describe('stateChangeCallback', () => {
    const stateChangeCallback = taskFetcher.__get__('stateChangeCallback');
    let stateChangeResult;
    const asStub = sinon.stub().callsFake((...args) => {
      stateChangeResult = stateChangeCallback(...args);
    });
    taskFetcher.__set__('stateChangeCallback', asStub);
    const refreshTasksForContact = sinon.stub().resolves([]);
    taskFetcher.__set__('refreshTasksForContact', refreshTasksForContact);

    it('wireup of contactTaskState to pouch', async () => {
      const userDoc = {};
      await taskFetcher.initialize(db, settingsDoc, userDoc);
      expect(db.put.args[0]).excludingEvery('rulesConfigHash').to.deep.eq([{
        _id: '_local/taskState',
        contactStateStore: {
          contactStates: {},
        },
      }]);

      await taskFetcher.fetchTasksFor(db, ['abc']);
      await stateChangeResult;
      expect(db.put.args[db.put.callCount - 1]).excludingEvery('rulesConfigHash').excluding('_rev').to.deep.eq([{
        _id: '_local/taskState',
        contactStateStore: {
          contactStates: {
            'abc': {
              calculatedAt: NOW,
            },
          },
        },
      }]);
      expect(db.put.args[0][0].contactStateStore.rulesConfigHash).to.eq(db.put.args[db.put.callCount - 1][0].contactStateStore.rulesConfigHash);

      // simulate restarting the app. the database is the same, but the taskFetcher is uninitialized
      rulesEmitter.shutdown();
      contactStateStore.__set__('state', undefined);

      const putCountBeforeInit = db.put.callCount;
      await taskFetcher.initialize(db, settingsDoc, userDoc);
      expect(db.put.callCount).to.eq(putCountBeforeInit);
      await taskFetcher.fetchTasksFor(db, ['abc']);
      expect(db.put.callCount).to.eq(putCountBeforeInit);
    });
  });

  it('latest schema rules are required when rules are provided', async () => {
    const rules = noolsPartnerTemplate('');
    const settings = { tasks: { rules }};
    try {
      await taskFetcher.initialize(db, settings, {});
      assert.fail('should throw');
    } catch (err) {
      expect(err.message).to.include('schema');
    }
  });

  describe('updateTasksFor', () => {
    it('empty array', async () => {
      sinon.stub(contactStateStore, 'markDirty').resolves();
      await taskFetcher.updateTasksFor(db, []);
      expect(contactStateStore.markDirty.args).to.deep.eq([[[]]]);
    });
  
    it('contact id', async () => {
      sinon.stub(contactStateStore, 'markDirty').resolves();
      await taskFetcher.updateTasksFor(db, chtDocs.contact._id);
      expect(contactStateStore.markDirty.args).to.deep.eq([[['patient']]]);
    });

    it('patient id', async () => {
      sinon.stub(contactStateStore, 'markDirty').resolves();
      await taskFetcher.updateTasksFor(db, [chtDocs.contact.patient_id]);
      expect(contactStateStore.markDirty.args).to.deep.eq([[['patient']]]);
    });

    it('unknown subject id still gets marked (headless scenario)', async () => {
      sinon.stub(contactStateStore, 'markDirty').resolves();
      await taskFetcher.updateTasksFor(db, 'headless');
      expect(contactStateStore.markDirty.args).to.deep.eq([[['headless']]]);
    });

    it('many', async () => {
      sinon.stub(contactStateStore, 'markDirty').resolves();
      await taskFetcher.updateTasksFor(db, ['headless', 'patient', 'patient_id']);
      expect(contactStateStore.markDirty.args).to.deep.eq([[['patient', 'headless', 'patient']]]); // dupes don't matter here
    });
  });

  describe('fetchTasksFor', () => {
    it('refresh headless', async () => {
      const rules = noolsPartnerTemplate('', { });
      const settings = { tasks: { rules }};
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      sinon.spy(db, 'bulkDocs');
      await taskFetcher.initialize(db, settings, {});
    
      const refreshTasksFor = sinon.stub().resolves([]);
      await taskFetcher.__with__({ refreshTasksFor })(() => taskFetcher.fetchTasksFor(db, ['headless']));
      expect(refreshTasksFor.callCount).to.eq(1);
      expect(refreshTasksFor.args[0][0]).excludingEvery('_rev').to.deep.eq({
        contactDocs: [],
        reportDocs: [headlessReport],
        taskDocs: [headlessTask],
        userContactId: 'mock_user_id',
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
      const settings = { tasks: { rules }};
      await taskFetcher.initialize(db, settings, {});
    
      const refreshTasksFor = sinon.stub().resolves([]);
      const withMockRefresher = taskFetcher.__with__({ refreshTasksFor });
    
      await withMockRefresher(() => taskFetcher.fetchTasksFor(db));
      expect(refreshTasksFor.callCount).to.eq(1);
      expect(refreshTasksFor.args[0][0]).excludingEvery('_rev').to.deep.eq({
        contactDocs: [chtDocs.contact],
        reportDocs: [headlessReport, reportConnectedByPlace, chtDocs.pregnancyReport],
        taskDocs: [headlessTask, taskRequestedByChtContact],
        userContactId: 'mock_user_id',
      });

      expect(contactStateStore.hasAllContacts()).to.be.true;
      await withMockRefresher(() => taskFetcher.fetchTasksFor(db));
      expect(refreshTasksFor.callCount).to.eq(2);
      expect(refreshTasksFor.args[1][0]).excludingEvery('_rev').to.deep.eq({});

      contactStateStore.markDirty(['headless']);
      await withMockRefresher(() => taskFetcher.fetchTasksFor(db));
      expect(refreshTasksFor.callCount).to.eq(3);
      expect(refreshTasksFor.args[2][0]).excludingEvery('_rev').to.deep.eq({
        contactDocs: [],
        reportDocs: [headlessReport],
        taskDocs: [{
          _id: 'headlessTask',
          type: 'task',
          owner: 'headless',
          requester: 'headless',
          state: 'Cancelled',
          stateReason: 'invalid',
          stateHistory: [{
            state: 'Cancelled',
            timestamp: 50000,
          }]
        }],
        userContactId: 'mock_user_id',
      });
    });

    it('confirm no heavy lifting when fetch fresh contact (performance)', async () => {
      sinon.spy(rulesEmitter, 'getEmissionsFor');
      sinon.stub(rulesEmitter, 'isLatestNoolsSchema').returns(true);
      const rules = noolsPartnerTemplate('', { });
      const settings = { tasks: { rules }};
      await taskFetcher.initialize(db, settings, {});
      await contactStateStore.markFresh(Date.now(), 'fresh');
    
      const actual = await taskFetcher.fetchTasksFor(db, ['fresh']);
      expect(actual).to.be.empty;
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(0);
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
      const settings = { tasks: { rules }};
      await taskFetcher.initialize(db, settings, {});
      await contactStateStore.markAllFresh(Date.now(), ['dirty']);
      await contactStateStore.markDirty(Date.now(), ['dirty']);
      const actual = await taskFetcher.fetchTasksFor(db);
      expect(actual).to.be.empty;
      expect(rulesEmitter.getEmissionsFor.callCount).to.eq(0);
      expect(db.query.callCount).to.eq(3);
      expect(db.query.args[2][0]).to.eq('medic-client/tasks');
      expect(db.query.args[2][1]).to.not.have.property('keys');
    });
  });

  describe('fetch', () => {
    const fetch = taskFetcher.__get__('fetch');

    it('contactStateStore is undefined by default', async () => {
      expect(await fetch.existingContactStateStore(db)).to.be.undefined;
    });

    it('fake contactStateStore can be fetched', async () => {
      const doc = { _id: '_local/taskState', details: 'stuff' };
      await db.put(doc);
      expect(doc).excluding('_rev').to.deep.eq(await fetch.existingContactStateStore(db));
    });

    describe('taskDataFor', () => {
      it('no contacts yields empty', async() => expect(await fetch.taskDataFor(db, [])).to.be.empty);
      it('empty contacts yields empty', async() => expect(await fetch.taskDataFor(db, [])).to.be.empty);
      it('unrecognized contact id yields empty', async () => {
        expect(await fetch.taskDataFor(db, ['abc'])).to.deep.eq({
          contactDocs: [],
          reportDocs: [],
          taskDocs: [],
          userContactId: 'mock_user_id',
        });
      });
      it('cht contact yields', async() => {
        const actual = await fetch.taskDataFor(db, [chtDocs.contact._id, 'abc']);
        expect(actual).excludingEvery('_rev').to.deep.eq({
          contactDocs: [chtDocs.contact],
          reportDocs: [reportConnectedByPlace, chtDocs.pregnancyReport],
          taskDocs: [taskRequestedByChtContact],
          userContactId: 'mock_user_id',
        });
      });
    });

    it('tasksByRelation by owner', async () => {
      const actual = await fetch.tasksByRelation(db, [chtDocs.contact._id, 'abc'], 'owner');
      expect(actual).excluding('_rev').to.deep.eq([taskOwnedByChtContact]);
    });

    it('tasksByRelation by requester', async () => {
      const actual = await fetch.tasksByRelation(db, [chtDocs.contact._id, 'abc'], 'requester');
      expect(actual).excluding('_rev').to.deep.eq([taskRequestedByChtContact]);
    });
  });
});
