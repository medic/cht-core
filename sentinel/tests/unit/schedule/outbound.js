const assert = require('chai').assert;
const sinon = require('sinon');
const rewire = require('rewire');

const config = require('../../../src/config');
const db = require('../../../src/db');

const outbound = rewire('../../../src/schedule/outbound');

describe('outbound schedule', () => {
  afterEach(() => sinon.restore());

  describe('queuedTasks', () => {
    let lineage;
    let restoreLineage;

    beforeEach(() => {
      lineage = sinon.stub();
      restoreLineage = outbound.__set__('lineage', { hydrateDocs: lineage });
    });

    afterEach(() => restoreLineage());

    it('gets all queues and associated docs', () => {
      const task = {
        _id: 'task:outbound:some_doc_id',
        doc_id: 'some_doc_id',
        queue: ['some', 'task']
      };
      const doc = {
        _id: 'some_doc_id',
        some: 'data'
      };

      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      const dbMedicAllDocs = sinon.stub(db.medic, 'allDocs');

      dbSentinelAllDocs.resolves({
        rows: [{
          key: task._id,
          doc: task
        }]
      });

      dbMedicAllDocs.resolves({
        rows: [{
          key: doc._id,
          doc: doc
        }]
      });

      lineage.resolves([doc]);

      return outbound.__get__('queuedTasks')()
        .then(results => {
          assert.deepEqual(dbSentinelAllDocs.args[0][0], {
            endkey: 'task:outbound:\ufff0',
            include_docs: true,
            limit: 1000,
            startkey: 'task:outbound:',
          });
          assert.equal(lineage.callCount, 1);
          assert.deepEqual(results, {
            validTasks: [{ task: task, doc: doc }],
            invalidTasks: [],
            lastDocId: task._id,
          });
        });
    });

    it('returns tasks separately if their doc cannot be resolved', () => {
      const task = {
        _id: 'task:outbound:some_doc_id',
        doc_id: 'some_doc_id',
        queue: ['some', 'task']
      };
      const error = {
        key: 'some_doc_id',
        error: 'not_found'
      };

      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      const dbMedicAllDocs = sinon.stub(db.medic, 'allDocs');

      dbSentinelAllDocs.resolves({
        rows: [{
          key: task._id,
          doc: task,
        }]
      });

      dbMedicAllDocs.resolves({
        rows: [error]
      });

      return outbound.__get__('queuedTasks')()
        .then(results => {
          assert.equal(lineage.callCount, 0);
          assert.deepEqual(results, {
            validTasks: [],
            invalidTasks: [{task: task, row: error}],
            lastDocId: task._id,
          });
        });
    });

    it('returns tasks separately if their doc was deleted', () => {
      const task = {
        _id: 'task:outbound:some_doc_id',
        doc_id: 'some_doc_id',
        queue: ['some', 'task']
      };
      const error = {
        key: 'some_doc_id',
        value: {
          deleted: true
        },
        doc: null
      };

      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      const dbMedicAllDocs = sinon.stub(db.medic, 'allDocs');

      dbSentinelAllDocs.resolves({
        rows: [{
          key: task._id,
          doc: task
        }]
      });

      dbMedicAllDocs.resolves({
        rows: [error]
      });

      return outbound.__get__('queuedTasks')()
        .then(results => {
          assert.equal(lineage.callCount, 0);
          assert.deepEqual(results, {
            validTasks: [],
            invalidTasks: [{task: task, row: error}],
            lastDocId: task._id,
          });
        });
    });

    it('Errors if the task fails to resolve a document for some other reason', () => {
      const task = {
        _id: 'task:outbound:some_doc_id',
        doc_id: 'some_doc_id',
        queue: ['some', 'task']
      };
      const error = {
        key: 'some_doc_id',
        error: 'CouchDB is now sentient and no longer wishes to serve your facile needs'
      };

      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      const dbMedicAllDocs = sinon.stub(db.medic, 'allDocs');

      dbSentinelAllDocs.resolves({
        rows: [{
          key: task._id,
          doc: task
        }]
      });

      dbMedicAllDocs.resolves({
        rows: [error]
      });

      return outbound.__get__('queuedTasks')()
        .catch(err => err)
        .then(err => {
          assert.match(err.message, /Unexpected error retrieving a document/);
        });
    });

    it('should nothing when the single doc to process should be skipped', () => {
      const task = {
        _id: 'task:outbound:some_doc_id',
        doc_id: 'some_doc_id',
        queue: ['some', 'task']
      };
      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      dbSentinelAllDocs.resolves({
        rows: [{
          key: task._id,
          doc: task
        }]
      });

      return outbound
        .__get__('queuedTasks')('task:outbound:some_doc_id')
        .then(results => {
          assert.deepEqual(dbSentinelAllDocs.args[0][0], {
            endkey: 'task:outbound:\ufff0',
            include_docs: true,
            limit: 1000,
            startkey: 'task:outbound:some_doc_id',
          });
          assert.equal(lineage.callCount, 0);
          assert.deepEqual(results, undefined);
        });
    });

    it('should nothing when no results returned', () => {
      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      dbSentinelAllDocs.resolves({ rows: [] });

      return outbound
        .__get__('queuedTasks')('task:outbound:otherDocId')
        .then(results => {
          assert.deepEqual(dbSentinelAllDocs.args[0][0], {
            endkey: 'task:outbound:\ufff0',
            include_docs: true,
            limit: 1000,
            startkey: 'task:outbound:otherDocId',
          });
          assert.equal(lineage.callCount, 0);
          assert.deepEqual(results, undefined);
        });
    });

    it('should skip first doc from being processed', () => {
      const task1 = {
        _id: 'task:outbound:some_doc_id',
        doc_id: 'some_doc_id',
        queue: ['some', 'task']
      };
      const task2 = {
        _id: 'task:outbound:some_doc_id_2',
        doc_id: 'some_doc_id_2',
        queue: ['some', 'task']
      };
      const doc2 = { _id: 'some_doc_id_2', date: '2' };
      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      dbSentinelAllDocs.resolves({
        rows: [
          { key: task1._id, doc: task1 },
          { key: task2._id, doc: task2 },
        ]
      });

      const dbMedicAllDocs = sinon.stub(db.medic, 'allDocs');
      dbMedicAllDocs.resolves({
        rows: [{ doc: doc2 }],
      });
      lineage.callsFake(doc => Promise.resolve(doc));

      return outbound
        .__get__('queuedTasks')(task1._id)
        .then(results => {
          assert.deepEqual(dbSentinelAllDocs.args[0][0], {
            endkey: 'task:outbound:\ufff0',
            include_docs: true,
            limit: 1000,
            startkey: 'task:outbound:some_doc_id',
          });
          assert.deepEqual(dbMedicAllDocs.callCount, 1);
          assert.deepEqual(dbMedicAllDocs.args[0], [{
            include_docs: true,
            keys: [doc2._id]
          }]);
          assert.equal(lineage.callCount, 1);
          assert.deepEqual(lineage.args[0][0], [doc2] );
          assert.deepEqual(results, {
            validTasks: [{ doc: doc2, task: task2 }],
            invalidTasks: [],
            lastDocId: task2._id,
          });
        });
    });
  });

  describe('getConfigurationsToPush', () => {
    it('should return empty for no queued pushes', () => {
      const config = {
        test1: {
          some: 'config'
        },
        test2: {
          some: 'more config'
        }
      };

      const queue = {
        _id: 'task:outbound:some_doc_id',
        queue: []
      };

      assert.deepEqual(
        outbound.__get__('getConfigurationsToPush')(config, queue),
        []
      );
    });

    it('should return pushes to attempt', () => {
      const config = {
        'test-push-1': {
          some: 'more config'
        },
        'test-push-2': {
          some: 'config'
        }
      };

      const queue = {
        _id: 'task:outbound:some_doc_id',
        queue: ['test-push-1']
      };

      assert.deepEqual(
        outbound.__get__('getConfigurationsToPush')(config, queue),
        [['test-push-1', {some: 'more config'}]]
      );
    });
  });

  describe('single push', () => {
    let mapDocumentToPayload;
    let sentinelPut;
    let send;
    let infodocSaveCompletedTasks;

    const restores = [];

    beforeEach(() => {
      const transitionsLib = {
        infodoc: sinon.stub()
      };
      sinon.stub(config, 'getTransitionsLib').returns(transitionsLib);

      mapDocumentToPayload = sinon.stub();
      restores.push(outbound.__set__('mapDocumentToPayload', mapDocumentToPayload));

      send = sinon.stub();
      infodocSaveCompletedTasks = sinon.stub();

      restores.push(outbound.__set__('outbound', { send: send }));
      restores.push(outbound.__set__('infodocLib', { saveCompletedTasks: infodocSaveCompletedTasks }));
      sentinelPut = sinon.stub(db.sentinel, 'put');
    });

    afterEach(() => restores.forEach(restore => restore()));

    it('should correct pass params to outbound push library and when successful store infodoc', () => {
      const config = {
        some: 'config'
      };

      const task = {
        _id: 'task:outbound:test-doc-1',
        doc_id: 'test-doc-1',
        queue: ['test-push-1']
      };

      const doc = {
        _id: 'test-doc-1', some: 'data-1'
      };

      const infoDoc = {
        _id: 'test-doc-1-info',
        type: 'info'
      };

      mapDocumentToPayload.returns({map: 'called'});
      send.resolves();
      sentinelPut.onFirstCall().resolves({rev: '1-abc'});
      sentinelPut.resolves();

      return outbound.__get__('singlePush')(task, doc, infoDoc, config, 'test-push-1')
        .then(() => {
          assert.equal(task._deleted, true);
          assert.equal(task._rev, '1-abc');
          assert.equal(send.callCount, 1);
          assert.equal(infodocSaveCompletedTasks.callCount, 1);
        });
    });

    it('should not remove the queue entry or update the info doc if it fails', () => {
      const config = {
        some: 'config'
      };

      const task = {
        _id: 'task:outbound:test-doc-1',
        doc_id: 'test-doc-1',
        queue: ['test-push-1']
      };

      const doc = {
        _id: 'test-doc-1', some: 'data-1'
      };

      mapDocumentToPayload.returns({map: 'called'});
      send.rejects({message: 'oh no one!'});

      return outbound.__get__('singlePush')(task, doc, config, 'test-config-1')
        .then(() => {
          assert.equal(task.queue.length, 1);
          assert.equal(infodocSaveCompletedTasks.callCount, 0);
        });
    });

    it('should remove queue entries that refer to non-existant config items', () => {
      const config = undefined;

      const task = {
        _id: 'task:outbound:test-doc-1',
        doc_id: 'test-doc-1',
        queue: ['test-push-1']
      };

      const doc = {
        _id: 'test-doc-1', some: 'data-1'
      };

      const infoDoc = {
        _id: 'test-doc-1-info',
        type: 'info'
      };

      mapDocumentToPayload.returns({map: 'called'});
      send.resolves();
      sentinelPut.onFirstCall().resolves({rev: '1-abc'});
      sentinelPut.resolves();

      return outbound.__get__('singlePush')(task, doc, infoDoc, config, 'test-push-1')
        .then(() => {
          assert.equal(task._deleted, true);
          assert.equal(task._rev, '1-abc');
          assert.equal(send.callCount, 0);
        });
    });

    it('should not throw errors or exceptions if mapping fails', () => {
      const config = {
        some: 'config'
      };

      const task = {
        _id: 'task:outbound:test-doc-1',
        doc_id: 'test-doc-1',
        queue: ['test-push-1']
      };

      const doc = {
        _id: 'test-doc-1', some: 'data-1'
      };


      mapDocumentToPayload.throws(new Error('oh no two!'));

      return outbound.__get__('singlePush')(task, doc, config, 'test-push-1');
    });
    it('should not throw errors or exceptions if sending fails', () => {
      const config = {
        some: 'config'
      };

      const task = {
        _id: 'task:outbound:test-doc-1',
        doc_id: 'test-doc-1',
        queue: ['test-push-1']
      };

      const doc = {
        _id: 'test-doc-1', some: 'data-1'
      };

      mapDocumentToPayload.returns({map: 'called'});
      send.rejects(new Error('oh no three!'));

      return outbound.__get__('singlePush')(task, doc, config, 'test-push-1');
    });
  });

  describe('removeInvalidTasks', () => {
    it('should delete tasks that it is passed', () => {
      sinon.stub(db.sentinel, 'bulkDocs').resolves();

      return outbound.__get__('removeInvalidTasks')([{
        task: {
          _id: 'task:outbound:test-doc-3',
          doc_id: 'test-doc-3',
          queue: ['test-push-2']
        },
        row: {
          key: 'task:outbound:test-doc-3',
          error: 'not_found'
        }
      }]).then(() => {
        assert.equal(db.sentinel.bulkDocs.callCount, 1);
        assert.deepEqual(db.sentinel.bulkDocs.args[0][0], [{
          _id: 'task:outbound:test-doc-3',
          doc_id: 'test-doc-3',
          queue: ['test-push-2'],
          _deleted: true
        }]);
      });
    });
  });

  describe('attachInfoDocs', () => {
    it('should attach info docs to the passed tasks', () => {
      const tasks = [
        {doc: {id: 'doc-1'}},
        {doc: {id: 'doc-2'}},
        {doc: {id: 'doc-3'}}
      ];

      const infoDocs = [
        {info: 'doc-1-info'},
        {info: 'doc-2-info'},
        {info: 'doc-3-info'}
      ];

      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      dbSentinelAllDocs.resolves({
        rows: infoDocs.map(doc => ({doc: doc}))
      });

      return outbound.__get__('attachInfoDocs')(tasks)
        .then(tasks => {
          assert.deepEqual(tasks[0].info, infoDocs[0]);
          assert.deepEqual(tasks[1].info, infoDocs[1]);
          assert.deepEqual(tasks[2].info, infoDocs[2]);
        });
    });
  });

  describe('execute', () => {
    let configGet;
    let queuedTasks;
    let singlePush;
    let removeInvalidTasks;
    let attachInfoDocs;
    let restores;

    beforeEach(() => {
      restores = [];
      configGet = sinon.stub(config, 'get');

      queuedTasks = sinon.stub();
      restores.push(outbound.__set__('queuedTasks', queuedTasks));

      singlePush = sinon.stub();
      restores.push(outbound.__set__('singlePush', singlePush));

      removeInvalidTasks = sinon.stub();
      restores.push(outbound.__set__('removeInvalidTasks', removeInvalidTasks));

      attachInfoDocs = sinon.stub();
      restores.push(outbound.__set__('attachInfoDocs', attachInfoDocs));
    });

    afterEach(() => {
      restores.forEach(restore => restore());
    });

    it('should coordinate finding all queues to process and working through them one by one', () => {
      const config = {
        'test-push-1': {
          some: 'config'
        },
        'test-push-2': {
          other: 'config'
        }
      };

      const task1 = {
        _id: 'task:outbound:test-doc-1',
        doc_id: 'test-doc-1',
        queue: ['test-push-1']
      };
      const task2 = {
        _id: 'task:outbound:test-doc-2',
        doc_id: 'test-doc-2',
        queue: ['test-push-2']
      };
      const task3 = {
        _id: 'task:outbound:test-doc-3',
        doc_id: 'test-doc-3',
        queue: ['test-push-2']
      };

      const doc1 = {
        _id: 'test-doc-1', some: 'data-1'
      };
      const doc2 = {
        _id: 'test-doc-2', some: 'data-2'
      };
      const error3 = {
        key: 'test-doc-3',
        error: 'not_found'
      };

      const doc1Info = {
        _id: 'test-doc-1-info'
      };
      const doc2Info = {
        _id: 'test-doc-2-info'
      };

      configGet.returns(config);
      queuedTasks.onCall(0).resolves({
        validTasks: [{ task: task1, doc: doc1 }, { task: task2, doc: doc2 }],
        invalidTasks: [{ task: task3, row: error3 }],
        lastDocId: task3._id,
      });
      queuedTasks.onCall(1).resolves();

      removeInvalidTasks.resolves();

      attachInfoDocs
        .onCall(0).resolves([{ task: task1, doc: doc1, info: doc1Info }, { task: task2, doc: doc2, info: doc2Info }])
        .onCall(1).resolves([]);

      singlePush.resolves();

      return outbound.execute().then(() => {
        assert.equal(queuedTasks.callCount, 2);
        assert.deepEqual(queuedTasks.args, [[undefined], [task3._id]]);
        assert.equal(configGet.callCount, 1);
        assert.equal(removeInvalidTasks.callCount, 1);
        assert.equal(attachInfoDocs.callCount, 2);
        assert.deepEqual(attachInfoDocs.args[0], [[{ task: task1, doc: doc1 }, { task: task2, doc: doc2 }]]);
        assert.deepEqual(attachInfoDocs.args[1], [[]]);
        assert.equal(singlePush.callCount, 2);

        assert.deepEqual(removeInvalidTasks.args[0][0], [{task: task3, row: error3}]);
        assert.deepEqual(singlePush.args[0], [task1, doc1, doc1Info, {some: 'config'}, 'test-push-1']);
        assert.deepEqual(singlePush.args[1], [task2, doc2, doc2Info, {other: 'config'}, 'test-push-2']);
      });
    });

    it('should keep querying until no more results', () => {
      const config = {
        'test-push-1': {
          some: 'config'
        },
        'test-push-2': {
          other: 'config'
        }
      };

      const task1 = {
        _id: 'task:outbound:test-doc-1',
        doc_id: 'test-doc-1',
        queue: ['test-push-1'],
      };
      const task2 = {
        _id: 'task:outbound:test-doc-2',
        doc_id: 'test-doc-2',
        queue: ['test-push-2'],
      };
      const task3 = {
        _id: 'task:outbound:test-doc-3',
        doc_id: 'test-doc-3',
        queue: ['test-push-2'],
      };

      const task4 = {
        _id: 'task:outbound:test-doc-4',
        doc_id: 'test-doc-4',
        queue: ['test-push-1'],
      };
      const task5 = {
        _id: 'task:outbound:test-doc-5',
        doc_id: 'test-doc-5',
        queue: ['test-push-2'],
      };
      const task6 = {
        _id: 'task:outbound:test-doc-6',
        doc_id: 'test-doc-6',
        queue: ['test-push-1'],
      };

      const doc1 = {
        _id: 'test-doc-1', some: 'data-1',
      };
      const doc2 = {
        _id: 'test-doc-2', some: 'data-2',
      };
      const error3 = {
        key: 'test-doc-3',
        error: 'not_found',
      };

      const error4 = {
        key: 'test-doc-4',
        error: 'not_found',
      };
      const doc5 = {
        _id: 'test-doc-5', some: 'data-5',
      };
      const doc6 = {
        _id: 'test-doc-6', some: 'data-6',
      };

      const doc1Info = { _id: 'test-doc-1-info' };
      const doc2Info = { _id: 'test-doc-2-info' };

      const doc5Info = { _id: 'test-doc-5-info' };
      const doc6Info = { _id: 'test-doc-6-info' };

      configGet.returns(config);
      queuedTasks.onCall(0).resolves({
        validTasks: [{ task: task1, doc: doc1 }, { task: task2, doc: doc2 }],
        invalidTasks: [{ task: task3, row: error3 }],
        lastDocId: task3._id,
      });
      queuedTasks.onCall(1).resolves({
        validTasks: [{ task: task5, doc: doc5 }, { task: task6, doc: doc6 }],
        invalidTasks: [{ task: task4, row: error4 }],
        lastDocId: task6._id,
      });
      queuedTasks.onCall(2).resolves();

      removeInvalidTasks.resolves();

      attachInfoDocs
        .onCall(0).resolves([{ task: task1, doc: doc1, info: doc1Info }, { task: task2, doc: doc2, info: doc2Info }])
        .onCall(1).resolves([{ task: task5, doc: doc5, info: doc5Info }, { task: task6, doc: doc6, info: doc6Info }])
        .onCall(2).resolves([]);

      singlePush.resolves();

      return outbound.execute().then(() => {
        assert.equal(queuedTasks.callCount, 3);
        assert.deepEqual(queuedTasks.args, [[undefined], [task3._id], [task6._id]]);
        assert.equal(configGet.callCount, 1);
        assert.equal(removeInvalidTasks.callCount, 2);
        assert.equal(attachInfoDocs.callCount, 3);
        assert.deepEqual(attachInfoDocs.args[0], [[{ task: task1, doc: doc1 }, { task: task2, doc: doc2 }]]);
        assert.deepEqual(attachInfoDocs.args[1], [[{ task: task5, doc: doc5 }, { task: task6, doc: doc6 }]]);
        assert.deepEqual(attachInfoDocs.args[2], [[]]);
        assert.equal(singlePush.callCount, 4);

        assert.deepEqual(removeInvalidTasks.args[0][0], [{task: task3, row: error3}]);
        assert.deepEqual(removeInvalidTasks.args[1][0], [{task: task4, row: error4}]);
        assert.deepEqual(singlePush.args[0], [task1, doc1, doc1Info, {some: 'config'}, 'test-push-1']);
        assert.deepEqual(singlePush.args[1], [task2, doc2, doc2Info, {other: 'config'}, 'test-push-2']);
        assert.deepEqual(singlePush.args[2], [task5, doc5, doc5Info, {other: 'config'}, 'test-push-2']);
        assert.deepEqual(singlePush.args[3], [task6, doc6, doc6Info, {some: 'config'}, 'test-push-1']);
      });
    });

    it('should only process queued tasks with due "cron" or non-existent "cron" field', () => {
      const batch = sinon.stub();
      restores.push(outbound.__set__('batch', batch));

      const VALID_CRON = 'outbound-with-due-cron';
      const INVALID_CRON = 'outbound-with-undue-cron';
      const WITHOUT_CRON = 'outbound-without-cron';

      const configs = {
        [VALID_CRON]: {
          cron: '5 * * * *'
        },
        [INVALID_CRON]: {
          cron: '15 * * * *'
        },
        [WITHOUT_CRON]: {
          /* test values */
        }
      };

      configGet.returns(configs);
      batch.resolvesArg(0);

      sinon.useFakeTimers(new Date('2023-07-11T03:05:00+0000').getTime());

      return outbound.execute().then((dueConfigs) => {
        assert.equal(configGet.callCount, 1);
        assert.equal(batch.callCount, 1);
        assert.equal(Object.keys(dueConfigs).length, 2);
        assert.deepEqual(dueConfigs[VALID_CRON], configs[VALID_CRON]);
        assert.deepEqual(dueConfigs[WITHOUT_CRON], configs[WITHOUT_CRON]);
        assert.isUndefined(dueConfigs[INVALID_CRON]);
      });
    });
  });
});
