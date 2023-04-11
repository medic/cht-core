const chai = require('chai');
const chaiExclude = require('chai-exclude');
const moment = require('moment');
const memdownMedic = require('@medic/memdown');
const sinon = require('sinon');

const { chtDocs, MS_IN_DAY } = require('./mocks');
const pouchdbProvider = require('../src/pouchdb-provider');
const { expect } = chai;
chai.use(chaiExclude);

const mockUserSettingsDoc = { _id: 'org.couchdb.user:username' };
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
const reportConnectedByPatientAndPlaceUuid = {
  _id: 'reportByPatientAndPlaceUuid',
  type: 'data_record',
  form: 'form',
  fields: {
    place_uuid: 'place',
  },
  patient_id: 'patient',
};
const reportConnectedByPlaceUuid = {
  _id: 'reportByPlaceUuid',
  type: 'data_record',
  form: 'form',
  fields: {
    place_uuid: 'place',
  },
};
const taskOwnedByChtContact = {
  _id: 'taskOwnedBy',
  type: 'task',
  owner: 'patient',
};
const taskRequestedByChtContact = {
  _id: 'taskRequestedBy',
  type: 'task',
  requester: 'patient',
};
const taskRequestedByChtPlace = {
  _id: 'taskRequestedByPlace',
  type: 'task',
  requester: 'place',
};
const headlessTask = {
  _id: 'headlessTask',
  type: 'task',
  requester: 'headless',
  owner: 'headless',
};
const cancelledTask = {
  _id: 'cancelledTask',
  type: 'task',
  requester: 'patient',
  owner: 'patient',
  state: 'Cancelled',
};

const completedTask = {
  _id: 'completedTask',
  type: 'task',
  requester: 'patient',
  owner: 'patient',
  state: 'Completed',
};

const failedTask = {
  _id: 'failedTask',
  type: 'task',
  requester: 'patient',
  owner: 'patient',
  state: 'Failed',
};

const readyTask = {
  _id: 'readyTask',
  type: 'task',
  requester: 'patient',
  owner: 'patient',
  state: 'Ready',
};

const draftTask = {
  _id: 'draftTask',
  type: 'task',
  requester: 'patient',
  owner: 'patient',
  state: 'Draft',
};

const readyTaskForPlace = {
  _id: 'readyPlaceTask',
  type: 'task',
  requester: 'place',
  owner: 'place',
  state: 'Ready',
};

const cancelledTaskForPlace = {
  _id: 'cancelledPlaceTask',
  type: 'task',
  requester: 'place',
  owner: 'place',
  state: 'Cancelled',
};

const fixtures = [
  chtDocs.contact,
  chtDocs.place,

  chtDocs.pregnancyReport,
  headlessReport,
  reportConnectedByPlace,
  reportConnectedByPatientAndPlaceUuid,
  reportConnectedByPlaceUuid,

  taskOwnedByChtContact,
  taskRequestedByChtContact,
  headlessTask,
  taskRequestedByChtPlace,

  cancelledTask,
  completedTask,
  failedTask,
  readyTask,
  draftTask,

  readyTaskForPlace,
  cancelledTaskForPlace,
];

describe('pouchdb provider', () => {
  let db;
  beforeEach(async () => {
    db = await memdownMedic('../..');
    await db.bulkDocs(fixtures);

    sinon.useFakeTimers(100000000);
    sinon.spy(db, 'put');
    sinon.spy(db, 'query');
  });

  afterEach(() => sinon.restore());

  describe('allTasks', () => {
    it('for owner', async () => expect(await pouchdbProvider(db).allTasks('owner')).excludingEvery('_rev')
      .to.deep.eq([
        taskRequestedByChtContact,
        taskRequestedByChtPlace,
        headlessTask,
        draftTask,
        readyTask,
        taskOwnedByChtContact,
        readyTaskForPlace,
      ]));
    it('for requester', async () => expect(await pouchdbProvider(db).allTasks('requester')).excludingEvery('_rev')
      .to.deep.eq([
        headlessTask,
        cancelledTask,
        completedTask,
        draftTask,
        failedTask,
        readyTask,
        taskRequestedByChtContact,
        cancelledTaskForPlace,
        readyTaskForPlace,
        taskRequestedByChtPlace,
      ]));
  });

  it('allTaskData', async () => {
    expect(await pouchdbProvider(db).allTaskData(mockUserSettingsDoc)).excludingEvery('_rev').to.deep.eq({
      contactDocs: [chtDocs.place, chtDocs.contact],
      reportDocs: [
        headlessReport,
        chtDocs.pregnancyReport,
        reportConnectedByPatientAndPlaceUuid,
        reportConnectedByPlace,
        reportConnectedByPlaceUuid,
      ],
      taskDocs: [
        headlessTask,
        cancelledTask,
        completedTask,
        draftTask,
        failedTask,
        readyTask,
        taskRequestedByChtContact,
        cancelledTaskForPlace,
        readyTaskForPlace,
        taskRequestedByChtPlace,
      ], // not owner
      userSettingsId: mockUserSettingsDoc._id,
    });
  });

  describe('commitTargetDoc', () => {
    const targets = [{ id: 'target' }];
    const userContactDoc = { _id: 'user' };
    const userSettingsDoc = { _id: 'org.couchdb.user:username' };

    it('create and update a doc', async () => {
      const docTag = '2019-07';
      await pouchdbProvider(db).commitTargetDoc(targets, userContactDoc, userSettingsDoc, docTag);

      expect(await db.get('target~2019-07~user~org.couchdb.user:username')).excluding('_rev').to.deep.eq({
        _id: 'target~2019-07~user~org.couchdb.user:username',
        updated_date: moment().startOf('day').valueOf(),
        type: 'target',
        owner: 'user',
        user: 'org.couchdb.user:username',
        targets,
        reporting_period: '2019-07',
      });

      const nextTargets = [{ id: 'target', score: 1 }];
      await pouchdbProvider(db).commitTargetDoc(nextTargets, userContactDoc, userSettingsDoc, docTag);
      const ignoredUpdate = await db.get('target~2019-07~user~org.couchdb.user:username');
      expect(ignoredUpdate._rev.startsWith('1-')).to.be.true;

      sinon.useFakeTimers(Date.now() + MS_IN_DAY);
      await pouchdbProvider(db).commitTargetDoc(nextTargets, userContactDoc, userSettingsDoc, docTag);
      expect(await db.get('target~2019-07~user~org.couchdb.user:username')).excluding('_rev').to.deep.eq({
        _id: 'target~2019-07~user~org.couchdb.user:username',
        updated_date: moment().startOf('day').valueOf(),
        type: 'target',
        owner: 'user',
        user: 'org.couchdb.user:username',
        targets: nextTargets,
        reporting_period: '2019-07',
      });
    });
  });

  describe('contactsBySubjectId', () => {
    it('empty yields empty', async () => expect(await pouchdbProvider(db).contactsBySubjectId([])).to.be.empty);
    it('patient_id yields id', async () => expect(await pouchdbProvider(db).contactsBySubjectId(['patient_id']))
      .to.deep.eq(['patient']));
    it('uuid yields uuid', async () => expect(await pouchdbProvider(db).contactsBySubjectId(['patient']))
      .to.deep.eq(['patient']));
    it('uuid and patient_id',
      async () => expect(await pouchdbProvider(db).contactsBySubjectId(['patient', 'patient_id']))
        .to.deep.eq(['patient', 'patient']) // dupes don't matter here
    );
  });

  describe('rulesStateStore', () => {
    it('rulesStateStore is empty by default', async () => {
      expect(await pouchdbProvider(db).existingRulesStateStore()).to.not.have.property('rulesStateStore');
    });

    it('fake rulesStateStore can be fetched', async () => {
      const expected = { _id: pouchdbProvider.RULES_STATE_DOCID, details: 'stuff' };
      await db.put(expected);

      const actual = await pouchdbProvider(db).existingRulesStateStore();
      expect(actual).excluding('_rev').to.deep.eq(expected);

      await pouchdbProvider(db).stateChangeCallback(actual, { updated: true });
      expect(await pouchdbProvider(db).existingRulesStateStore()).excluding('_rev').to.deep.eq({
        _id: pouchdbProvider.RULES_STATE_DOCID,
        updated: true,
        details: 'stuff'
      });
    });
  });

  describe('tasksByRelation', () => {
    it('by owner', async () => {
      const actual = await pouchdbProvider(db).tasksByRelation([chtDocs.contact._id, 'abc'], 'owner');
      expect(actual).excluding('_rev').to.deep.eq([
        draftTask,
        readyTask,
        taskOwnedByChtContact,
      ]);
    });

    it('by requester', async () => {
      const actual = await pouchdbProvider(db).tasksByRelation([chtDocs.contact._id, 'abc'], 'requester');
      expect(actual).excluding('_rev').to.deep.eq([
        cancelledTask,
        completedTask,
        draftTask,
        failedTask,
        readyTask,
        taskRequestedByChtContact,
      ]);
    });
  });

  describe('taskDataFor', () => {
    it('no contacts yields empty', async() => expect(await pouchdbProvider(db).taskDataFor([])).to.be.empty);
    it('empty contacts yields empty', async() => expect(await pouchdbProvider(db).taskDataFor([])).to.be.empty);
    it('unrecognized contact id yields empty', async () => {
      expect(await pouchdbProvider(db).taskDataFor(['abc'], mockUserSettingsDoc)).to.deep.eq({
        contactDocs: [],
        reportDocs: [],
        taskDocs: [],
        userSettingsId: 'org.couchdb.user:username',
      });
    });
    it('cht contact yields', async() => {
      const actual = await pouchdbProvider(db).taskDataFor([chtDocs.contact._id, 'abc'], mockUserSettingsDoc);
      expect(actual).excludingEvery('_rev').to.deep.eq({
        contactDocs: [chtDocs.contact],
        reportDocs: [chtDocs.pregnancyReport, reportConnectedByPatientAndPlaceUuid, reportConnectedByPlace ],
        taskDocs: [
          cancelledTask,
          completedTask,
          draftTask,
          failedTask,
          readyTask,
          taskRequestedByChtContact,
        ],
        userSettingsId: 'org.couchdb.user:username',
      });
    });

    it('should exclude multi-subject reports who have other "primary" subjects for contact', async () => {
      const forContact = await pouchdbProvider(db).taskDataFor([chtDocs.contact._id], mockUserSettingsDoc);
      expect(forContact).excludingEvery('_rev').to.deep.eq({
        contactDocs: [chtDocs.contact],
        reportDocs: [chtDocs.pregnancyReport, reportConnectedByPatientAndPlaceUuid, reportConnectedByPlace, ],
        taskDocs: [
          cancelledTask,
          completedTask,
          draftTask,
          failedTask,
          readyTask,
          taskRequestedByChtContact,
        ],
        userSettingsId: 'org.couchdb.user:username',
      });
    });

    it('should exclude multi-subject reports who have other "primary" subjects for place', async () => {
      const forPlace = await pouchdbProvider(db).taskDataFor([chtDocs.place._id], mockUserSettingsDoc);
      chai.expect(forPlace).excludingEvery('_rev').to.deep.eq({
        contactDocs: [chtDocs.place],
        reportDocs: [reportConnectedByPlaceUuid],
        taskDocs: [cancelledTaskForPlace, readyTaskForPlace, taskRequestedByChtPlace],
        userSettingsId: 'org.couchdb.user:username',
      });
    });

    it('should include all for both', async () => {
      const forPlace = await pouchdbProvider(db)
        .taskDataFor([chtDocs.place._id, chtDocs.contact._id], mockUserSettingsDoc);
      chai.expect(forPlace).excludingEvery('_rev').to.deep.eq({
        contactDocs: [chtDocs.place, chtDocs.contact],
        reportDocs: [
          reportConnectedByPatientAndPlaceUuid,
          reportConnectedByPlaceUuid,
          chtDocs.pregnancyReport,
          reportConnectedByPlace,
        ],
        taskDocs: [
          cancelledTaskForPlace,
          readyTaskForPlace,
          taskRequestedByChtPlace,
          cancelledTask,
          completedTask,
          draftTask,
          failedTask,
          readyTask,
          taskRequestedByChtContact
        ],
        userSettingsId: 'org.couchdb.user:username',
      });
    });
  });

  describe('allTaskRowsByOwner', () => {
    it('should return tasks_by_contact for patient', async () => {
      const contactIds = ['patient', 'thing'];

      const rowsByOwner = await pouchdbProvider(db).allTaskRowsByOwner(contactIds);
      chai.expect(rowsByOwner).excludingEvery('_rev').to.have.deep.members([
        { id: completedTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Completed' } },
        { id: failedTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Failed' } },
        { id: cancelledTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Cancelled' } },
        { id: readyTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Ready' } },
        { id: draftTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Draft' } },
        { id: taskOwnedByChtContact._id, key: ['owner', 'all', 'patient'], value: { } },
      ]);
    });

    it('should return tasks_by_contact for place', async () => {
      const contactIds = ['place', 'thing'];

      const rowsByOwner = await pouchdbProvider(db).allTaskRowsByOwner(contactIds);
      chai.expect(rowsByOwner).excludingEvery('_rev').to.have.deep.members([
        { id: cancelledTaskForPlace._id, key: ['owner', 'all', 'place'], value: { state: 'Cancelled' } },
        { id: readyTaskForPlace._id, key: ['owner', 'all', 'place'], value: { state: 'Ready' } },
      ]);
    });

    it('should return tasks_by_contact for no provided contacts', async () => {
      const rowsByOwner = await pouchdbProvider(db).allTaskRowsByOwner([]);
      chai.expect(rowsByOwner).excludingEvery('_rev').to.deep.equal([]);
    });

    it('should throw errors', async () => {
      const circular = { a: 'test' };
      circular.a = circular;
      try {
        await pouchdbProvider(db).allTaskRowsByOwner([circular]);
        chai.expect.fail('should have thrown');
      } catch (err) {
        chai.expect(err.message).to.equal('Maximum call stack size exceeded');
        chai.expect(err).to.be.an.instanceof(RangeError);
      }
    });
  });

  describe('allTaskRows', () => {
    it('should return all task rows', async () => {
      const allRows = await pouchdbProvider(db).allTaskRows();
      expect(allRows).excludingEvery('_rev').to.have.deep.members([
        { id: completedTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Completed' } },
        { id: failedTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Failed' } },
        { id: cancelledTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Cancelled' } },
        { id: draftTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Draft' } },
        { id: readyTask._id, key: ['owner', 'all', 'patient'], value: { state: 'Ready' } },
        { id: taskOwnedByChtContact._id, key: ['owner', 'all', 'patient'], value: { } },
        { id: taskRequestedByChtContact._id, key: ['owner', 'all', '_unassigned'], value: { } },
        { id: taskRequestedByChtPlace._id, key: ['owner', 'all', '_unassigned'], value: { } },
        { id: headlessTask._id, key: ['owner', 'all', 'headless'], value: { } },
        { id: cancelledTaskForPlace._id, key: ['owner', 'all', 'place'], value: { state: 'Cancelled' } },
        { id: readyTaskForPlace._id, key: ['owner', 'all', 'place'], value: { state: 'Ready' } },
      ]);
    });
  });
});
