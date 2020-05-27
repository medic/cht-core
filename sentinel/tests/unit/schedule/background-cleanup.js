const assert = require('chai').assert;
const sinon = require('sinon');

const db = require('../../../src/db');
const metadata = require('../../../src/lib/metadata');


const schedule = require('../../../src/schedule/background-cleanup');

describe('Background cleanup tasks', () => {
  afterEach(() => sinon.restore());

  describe('execute', () => {
    beforeEach(() => {
      sinon.stub(schedule, '_getChanges');
      sinon.stub(schedule, '_deleteInfoDocs');
      sinon.stub(schedule, '_deleteReadDocs');
      sinon.stub(metadata, 'setBackgroundCleanupSeq');
    });

    it('Gets seq, executes tasks and on success stores latest seq', (done) => {
      schedule._getChanges.resolves({changes: [{change: 1}], checkpointSeq: '42-blah', more: false});
      schedule._deleteInfoDocs.resolves();
      schedule._deleteReadDocs.resolves();
      metadata.setBackgroundCleanupSeq.resolves();

      schedule.execute(err => {
        try {
          assert.isUndefined(err);
          assert.equal(schedule._getChanges.callCount, 1);
          assert.equal(schedule._deleteInfoDocs.callCount, 1);
          assert.equal(schedule._deleteReadDocs.callCount, 1);
          assert.equal(metadata.setBackgroundCleanupSeq.callCount, 1);
          assert.equal(metadata.setBackgroundCleanupSeq.args[0][0], '42-blah');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('Does multiple batches until it runs out of new changes', (done) => {
      const roundOneChanges = [...Array(1000).keys()].map(i => ({change: i}));
      const roundTwoChanges = [...Array(999).keys()].map(i => ({change: i}));
      schedule._getChanges.onFirstCall().resolves({changes: roundOneChanges, checkpointSeq: '1000-blah', more: true});
      schedule._getChanges.onSecondCall().resolves({changes: roundTwoChanges, checkpointSeq: '1999-blah', more: false});
      schedule._deleteInfoDocs.resolves();
      schedule._deleteReadDocs.resolves();
      metadata.setBackgroundCleanupSeq.resolves();

      schedule.execute(err => {
        try {
          assert.isUndefined(err);
          assert.equal(schedule._getChanges.callCount, 2);
          assert.equal(schedule._deleteInfoDocs.callCount, 2);
          assert.equal(schedule._deleteReadDocs.callCount, 2);
          assert.equal(metadata.setBackgroundCleanupSeq.callCount, 2);
          assert.equal(metadata.setBackgroundCleanupSeq.args[0][0], '1000-blah');
          assert.equal(metadata.setBackgroundCleanupSeq.args[1][0], '1999-blah');
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('errors if get seq fails', () => {
      schedule._getChanges.rejects({oh: 'no'});
      schedule.execute(err => {
        assert.deepEqual(err, {oh: 'no'});
      });
    });
    it('errors and doesnt store new seq if deleteInfoDocs fails', () => {
      schedule._getChanges.resolves([{change: 1}, '42-blah']);
      schedule._deleteInfoDocs.rejects({oh: 'no'});
      schedule._deleteReadDocs.resolves();

      schedule.execute(err => {
        assert.deepEqual(err, {oh: 'no'});
        assert.equal(metadata.setBackgroundCleanupSeq.callCount, 0);
      });
    });
    it('errors and doesnt store new seq if deleteReadDocs fails', () => {
      schedule._getChanges.resolves([{change: 1}, '42-blah']);
      schedule._deleteInfoDocs.resolves();
      schedule._deleteReadDocs.rejects({oh: 'no'});

      schedule.execute(err => {
        assert.deepEqual(err, {oh: 'no'});
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

      return schedule._getChanges()
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

      return schedule._getChanges()
        .then(({more}) => {
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

      return schedule._getChanges()
        .then(({more}) => {
          assert.equal(more, true);
        });
    });
  });

  describe('deleteInfoDocs', () => {
    it('deletes infodocs related to deleted document changes', () => {

      sinon.stub(db.sentinel, 'allDocs').resolves({
        rows: [{
          error: 'not_found'
        }, {
          id: 'doc2-info',
          value: {rev: '1-abc'}
        }]
      });
      sinon.stub(db.sentinel, 'bulkDocs').resolves();

      return schedule._deleteInfoDocs([{id: 'doc1', deleted: true}, {id: 'doc2', deleted: true}, {id: 'doc3'}])
        .then(() => {
          assert.equal(db.sentinel.allDocs.callCount, 1);
          assert.deepEqual(db.sentinel.allDocs.args[0][0], {
            keys: ['doc1-info', 'doc2-info']
          });
          assert.equal(db.sentinel.bulkDocs.callCount, 1);
          assert.deepEqual(db.sentinel.bulkDocs.args[0][0], [{
            _id: 'doc2-info',
            _rev: '1-abc',
            _deleted: true
          }]);
        });
    });

    it('Doesnt delete if there are no deletes in the changes', () => {
      sinon.stub(db.sentinel, 'allDocs').resolves();
      sinon.stub(db.sentinel, 'bulkDocs').resolves();

      return schedule._deleteInfoDocs([{id: 'abc'}])
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
        'medic-users-meta']);

      sinon.stub(db, 'medicDbName').value('medic');
      sinon.stub(db, 'close');

      const aliceDb = {allDocs: sinon.stub(), bulkDocs: sinon.stub()};
      const bobDb = {allDocs: sinon.stub(), bulkDocs: sinon.stub()};
      const carolDb = {allDocs: sinon.stub(), bulkDocs: sinon.stub()};

      aliceDb.allDocs.resolves({rows: [
        {id: 'read:report:doc1', value: {rev: '1-abc'}},
        {error: 'not_found'}, {error: 'not_found'}, {error: 'not_found'}]});
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

      return schedule._deleteReadDocs([{id: 'doc1', deleted: true}, {id: 'doc2', deleted: true}, {id: 'doc3'}])
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
      sinon.stub(db, 'allDbs').resolves();

      return schedule._deleteInfoDocs([{id: 'abc'}])
        .then(() => {
          assert.equal(db.allDbs.callCount, 0);
        });
    });
  });
});
