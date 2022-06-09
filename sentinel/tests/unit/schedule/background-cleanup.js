const assert = require('chai').assert;
const sinon = require('sinon');
const rewire = require('rewire');

const db = require('../../../src/db');
const metadata = require('../../../src/lib/metadata');

let schedule;

describe('Background cleanup tasks', () => {
  afterEach(() => sinon.restore());
  beforeEach(() => {
    schedule = rewire('../../../src/schedule/background-cleanup');
    sinon.stub(metadata, 'setBackgroundCleanupSeq');
  });

  describe('execute', () => {
    it('Gets seq, executes tasks and on success stores latest seq', () => {
      const changesResult = { changes: [{change: 1}], checkpointSeq: '42-blah', more: false };
      schedule.__set__('getChanges', sinon.stub().resolves(changesResult));
      schedule.__set__('deleteInfoDocs', sinon.stub().resolves());
      schedule.__set__('deleteReadDocs', sinon.stub().resolves());
      metadata.setBackgroundCleanupSeq.resolves();

      return schedule.execute().then(() => {
        assert.equal(schedule.__get__('getChanges').callCount, 1);
        assert.equal(schedule.__get__('deleteInfoDocs').callCount, 1);
        assert.deepEqual(schedule.__get__('deleteInfoDocs').args[0], [changesResult.changes]);
        assert.equal(schedule.__get__('deleteReadDocs').callCount, 1);
        assert.deepEqual(schedule.__get__('deleteReadDocs').args[0], [changesResult.changes]);
        assert.equal(metadata.setBackgroundCleanupSeq.callCount, 1);
        assert.equal(metadata.setBackgroundCleanupSeq.args[0][0], '42-blah');
      });
    });

    it('Does multiple batches until it runs out of new changes', () => {
      const roundOneChanges = [...Array(1000).keys()].map(i => ({change: i}));
      const roundTwoChanges = [...Array(999).keys()].map(i => ({change: i}));
      const getChanges = sinon.stub()
        .onCall(0).resolves({changes: roundOneChanges, checkpointSeq: '1000-blah', more: true})
        .onCall(1).resolves({changes: roundTwoChanges, checkpointSeq: '1999-blah', more: false});
      schedule.__set__('getChanges', getChanges);
      schedule.__set__('deleteInfoDocs', sinon.stub().resolves());
      schedule.__set__('deleteReadDocs', sinon.stub().resolves());
      metadata.setBackgroundCleanupSeq.resolves();

      return schedule.execute().then(() => {
        assert.equal(schedule.__get__('getChanges').callCount, 2);
        assert.equal(schedule.__get__('deleteInfoDocs').callCount, 2);
        assert.deepEqual(schedule.__get__('deleteInfoDocs').args[0], [roundOneChanges]);
        assert.deepEqual(schedule.__get__('deleteInfoDocs').args[1], [roundTwoChanges]);
        assert.equal(schedule.__get__('deleteReadDocs').callCount, 2);
        assert.deepEqual(schedule.__get__('deleteReadDocs').args[0], [roundOneChanges]);
        assert.deepEqual(schedule.__get__('deleteReadDocs').args[1], [roundTwoChanges]);
        assert.equal(metadata.setBackgroundCleanupSeq.callCount, 2);
        assert.equal(metadata.setBackgroundCleanupSeq.args[0][0], '1000-blah');
        assert.equal(metadata.setBackgroundCleanupSeq.args[1][0], '1999-blah');
      });
    });

    it('errors if get seq fails', () => {
      schedule.__set__('getChanges', sinon.stub().rejects({ oh: 'no' }));
      return schedule
        .execute()
        .then(() => assert.fail('Should have thrown'))
        .catch(err => assert.deepEqual(err, { oh: 'no' }));
    });

    it('errors and doesnt store new seq if deleteInfoDocs fails', () => {
      schedule.__set__('getChanges', sinon.stub().resolves({ changes: [{ change: 1 }], checkpointSeq: '42-blah' }));
      schedule.__set__('deleteInfoDocs', sinon.stub().rejects({ oh: 'no' }));
      schedule.__set__('deleteReadDocs', sinon.stub().resolves());

      return schedule
        .execute()
        .then(() => assert.fail('Should have thrown'))
        .catch(err => {
          assert.deepEqual(err, { oh: 'no' });
          assert.equal(metadata.setBackgroundCleanupSeq.callCount, 0);
        });
    });

    it('errors and doesnt store new seq if deleteReadDocs fails', () => {
      schedule.__set__('getChanges', sinon.stub().resolves({ changes: [{ change: 1 }], checkpointSeq: '42-blah' }));
      schedule.__set__('deleteInfoDocs', sinon.stub().resolves());
      schedule.__set__('deleteReadDocs', sinon.stub().rejects({ oh: 'no' }));

      return schedule
        .execute()
        .then(() => assert.fail('Should have thrown'))
        .catch(err => {
          assert.deepEqual(err, { oh: 'no' });
          assert.equal(metadata.setBackgroundCleanupSeq.callCount, 0);
        });
    });
  });

  describe('getChanges', () => {
    it('gets the latest batch of changes', () => {
      sinon.stub(metadata, 'getBackgroundCleanupSeq').resolves('42-therealseqbuthashed');
      sinon.stub(db.medic, 'changes').resolves({
        last_seq: '99-morehashedstuff',
        results: [{
          id: 'doc1',
          changes: [{rev: '1-abc'}]
        }, {
          id: 'doc2',
          changes: [{rev: '1-def'}],
          deleted: true
        }]
      });

      return schedule
        .__get__('getChanges')()
        .then(getChangesReturns => {
          assert.equal(metadata.getBackgroundCleanupSeq.callCount, 1);
          assert.equal(db.medic.changes.callCount, 1);

          assert.deepEqual(getChangesReturns, {
            changes: [{
              id: 'doc1',
              changes: [{rev: '1-abc'}]
            }, {
              id: 'doc2',
              changes: [{rev: '1-def'}],
              deleted: true
            }],
            checkpointSeq: '99-morehashedstuff',
            more: false
          });
        });
    });

    it('returns more: false if we didnt get BATCH changes back', () => {
      sinon.stub(metadata, 'getBackgroundCleanupSeq').resolves('42-therealseqbuthashed');

      const lessThanBatchChanges = [...Array(999).keys()].map(i => ({change: i}));
      sinon.stub(db.medic, 'changes').resolves({
        results: lessThanBatchChanges,
        last_seq: '999-blah'
      });

      return schedule.__get__('getChanges')().then(({more}) => {
        assert.equal(more, false);
      });
    });

    it('returns more: true if we didnt get BATCH changes back', () => {
      sinon.stub(metadata, 'getBackgroundCleanupSeq').resolves('42-therealseqbuthashed');

      const moreThanBatchChanges = [...Array(1000).keys()].map(i => ({change: i}));
      sinon.stub(db.medic, 'changes').resolves({
        results: moreThanBatchChanges,
        last_seq: '1000-blah'
      });

      return schedule.__get__('getChanges')().then(({more}) => {
        assert.equal(more, true);
      });
    });
  });

  describe('deleteInfoDocs', () => {
    it('deletes infodocs related to deleted document changes', () => {
      sinon.stub(db.sentinel, 'allDocs').resolves({
        rows: [
          { error: 'not_found'},
          { id: 'doc2-info', value: { rev: '1-abc' }},
        ]
      });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: 'doc1-info', value: { rev: '1-bcd' }},
          { error: 'not_found' },
        ]
      });

      sinon.stub(db.sentinel, 'bulkDocs').resolves();
      sinon.stub(db.medic, 'bulkDocs').resolves();
      const changes = [{ id: 'doc1', deleted: true }, { id: 'doc2', deleted: true }, { id: 'doc3' }];

      return schedule.__get__('deleteInfoDocs')(changes).then(() => {
        assert.equal(db.sentinel.allDocs.callCount, 1);
        assert.deepEqual(db.sentinel.allDocs.args[0][0], {
          keys: ['doc1-info', 'doc2-info']
        });
        assert.equal(db.medic.allDocs.callCount, 1);
        assert.deepEqual(db.medic.allDocs.args[0][0], {
          keys: ['doc1-info', 'doc2-info']
        });
        assert.equal(db.sentinel.bulkDocs.callCount, 1);
        assert.deepEqual(db.sentinel.bulkDocs.args[0][0], [{
          _id: 'doc2-info',
          _rev: '1-abc',
          _deleted: true
        }]);
        assert.equal(db.medic.bulkDocs.callCount, 1);
        assert.deepEqual(db.medic.bulkDocs.args[0][0], [{
          _id: 'doc1-info',
          _rev: '1-bcd',
          _deleted: true
        }]);
      });
    });

    it('Doesnt delete if there are no deletes in the changes', () => {
      sinon.stub(db.sentinel, 'allDocs').resolves();
      sinon.stub(db.sentinel, 'bulkDocs').resolves();

      return schedule
        .__get__('deleteInfoDocs')([{ id: 'abc' }])
        .then(() => {
          assert.equal(db.sentinel.allDocs.callCount, 0);
          assert.equal(db.sentinel.bulkDocs.callCount, 0);
        });
    });
  });

  describe('deleteReadDocs', () => {
    it('deletes read receipts related to deleted document changes', () => {
      sinon.stub(db, 'allDbs').resolves([
        'medic-user-alice-meta',
        'medic-user-bob-meta',
        'medic-user-carol-meta',
        'medic',
        'medic-sentinel',
        'medic-users-meta',
      ]);

      sinon.stub(db, 'medicDbName').value('medic');
      sinon.stub(db, 'close');

      const aliceDb = {allDocs: sinon.stub(), bulkDocs: sinon.stub()};
      const bobDb = {allDocs: sinon.stub(), bulkDocs: sinon.stub()};
      const carolDb = {allDocs: sinon.stub(), bulkDocs: sinon.stub()};

      aliceDb.allDocs.resolves({rows: [
        {id: 'read:report:doc1', value: {rev: '1-abc'}},
        {error: 'not_found'}, {error: 'not_found'}, {error: 'not_found'},
      ]});
      aliceDb.bulkDocs.resolves();

      bobDb.allDocs.resolves({rows: [
        {error: 'not_found'}, {error: 'not_found'}, {error: 'not_found'},
        {id: 'read:message:doc2', value: {rev: '1-abc'}}
      ]});
      bobDb.bulkDocs.resolves();

      carolDb.allDocs.resolves({rows:
        [{error: 'not_found'}, {error: 'not_found'}, {error: 'not_found'}, {error: 'not_found'}]});
      carolDb.bulkDocs.resolves();

      sinon.stub(db, 'get')
        .withArgs('medic-user-alice-meta').returns(aliceDb)
        .withArgs('medic-user-bob-meta').returns(bobDb)
        .withArgs('medic-user-carol-meta').returns(carolDb);

      const changes = [{ id: 'doc1', deleted: true }, { id: 'doc2', deleted: true }, { id: 'doc3' }];

      return schedule
        .__get__('deleteReadDocs')(changes)
        .then(() => {
          assert.equal(db.allDbs.callCount, 1);

          assert.equal(aliceDb.allDocs.callCount, 1);
          assert.deepEqual(aliceDb.allDocs.args[0][0], {
            keys: ['read:report:doc1', 'read:message:doc1', 'read:report:doc2', 'read:message:doc2']
          });
          assert.equal(aliceDb.bulkDocs.callCount, 1);
          assert.deepEqual(aliceDb.bulkDocs.args[0][0], [{
            _id: 'read:report:doc1',
            _rev: '1-abc',
            _deleted: true
          }]);

          assert.equal(bobDb.allDocs.callCount, 1);
          assert.deepEqual(bobDb.allDocs.args[0][0], {
            keys: ['read:report:doc1', 'read:message:doc1', 'read:report:doc2', 'read:message:doc2']
          });
          assert.equal(bobDb.bulkDocs.callCount, 1);
          assert.deepEqual(bobDb.bulkDocs.args[0][0], [{
            _id: 'read:message:doc2',
            _rev: '1-abc',
            _deleted: true
          }]);

          assert.equal(carolDb.allDocs.callCount, 1);
          assert.deepEqual(carolDb.allDocs.args[0][0], {
            keys: ['read:report:doc1', 'read:message:doc1', 'read:report:doc2', 'read:message:doc2']
          });
          assert.equal(carolDb.bulkDocs.callCount, 0);

          assert.equal(db.close.callCount, 3);
        });
    });

    it('Doesnt delete if there are no deletes in the changes', () => {
      sinon.stub(db, 'allDbs');

      return schedule.__get__('deleteInfoDocs')([{ id: 'abc' }])
        .then(() => {
          assert.equal(db.allDbs.callCount, 0);
        });
    });
  });
});
