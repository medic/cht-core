const assert = require('chai').assert;
const sinon = require('sinon');
const rewire = require('rewire');
const request = require('request-promise-native');
const secureSettings = require('@medic/settings');
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
      restoreLineage = outbound.__set__('lineage', {hydrateDocs: lineage});
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
          doc: task
        }]
      });

      dbMedicAllDocs.resolves({
        rows: [{
          doc: doc
        }]
      });

      lineage.resolves([doc]);

      return outbound.__get__('queuedTasks')()
        .then(results => {
          assert.equal(lineage.callCount, 1);
          assert.deepEqual(results, {
            validTasks: [{ task: task, doc: doc }],
            invalidTasks: []
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
            invalidTasks: [{task: task, row: error}]
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
            invalidTasks: [{task: task, row: error}]
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
  });

  describe('mapDocumentToPayload', () => {
    const mapDocumentToPayload = outbound.__get__('mapDocumentToPayload');

    it('supports simple dest => src mapping', () => {
      const doc = {
        _id: 'test-doc',
        foo: 42,
        bar: 'baaa'
      };

      const conf = {
        mapping: {
          'api_foo': 'doc.foo',
          'bar': 'doc.bar'
        }
      };

      assert.deepEqual(mapDocumentToPayload(doc, conf, 'test-doc'), {
        api_foo: 42,
        bar: 'baaa'
      });
    });

    it('supports deep dest => src mapping', () => {
      const doc = {
        _id: 'test-doc',
        reported_date: 42,
        fields: {
          foo: 'baaaaa'
        }
      };

      const conf = {
        mapping: {
          'when': 'doc.reported_date',
          'data.the_foo': 'doc.fields.foo'
        }
      };

      assert.deepEqual(mapDocumentToPayload(doc, conf, 'test-doc'), {
        when: 42,
        data: {
          the_foo: 'baaaaa'
        }
      });
    });

    it('errors if src path does not exist', () => {
      const doc = {
        _id: 'test-doc',
        reported_date: 42,
        fields: {
          not_foo: 'baaaaa'
        }
      };

      const conf = {
        mapping: {
          'foo': 'doc.fields.foo'
        }
      };

      assert.throws(() => mapDocumentToPayload(doc, conf, 'test-config'), `Mapping error for 'test-config/foo' on ` +
        `source document 'test-doc': cannot find 'doc.fields.foo' on source document`);
    });

    it('supports optional path mappings', () => {
      const doc = {
        _id: 'test-doc',
        reported_date: 42,
        fields: {
          not_foo: 'baaaaa',
          bar: 42
        }
      };

      const conf = {
        mapping: {
          foo: {
            path: 'doc.fields.foo',
            optional: true
          },
          bar: 'doc.fields.bar'
        }
      };

      assert.deepEqual(mapDocumentToPayload(doc, conf, 'test-doc'), {
        bar: 42
      });
    });

    it('supports basic awkward data conversion via arbitrary expressions', () => {
      const doc = {
        _id: 'test-doc',
        fields: {
          a_list: ['a', 'b', 'c', 'd'],
          foo: 'No',
        }
      };

      const conf = {
        mapping: {
          list_count: {expr: 'doc.fields.a_list.length'},
          foo: {expr: 'doc.fields.foo === \'Yes\''},
        }
      };
      assert.deepEqual(mapDocumentToPayload(doc, conf, 'test-doc'), {
        list_count: 4,
        foo: false
      });
    });

    it('throws a useful exception if the expression errors', () => {
      const doc = {
        _id: 'test-doc',
      };

      const conf = {
        mapping: {
          is_gonna_fail: {expr: 'doc.fields.null.pointer'},
        }
      };

      assert.throws(() => mapDocumentToPayload(doc, conf, 'test-doc'), /Mapping error/);
    });
  });

  describe('push', () => {

    it('should push on minimal configuration', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(request, 'post').resolves();

      return outbound.__get__('send')(payload, conf)
        .then(() => {
          assert.equal(request.post.callCount, 1);
          assert.equal(request.post.args[0][0].url, 'http://test/foo');
          assert.deepEqual(request.post.args[0][0].body, {some: 'data'});
          assert.equal(request.post.args[0][0].json, true);
        });
    });

    it('should support pushing via basic auth', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          auth: {
            type: 'Basic',
            username: 'admin',
            password_key: 'test-config'
          },
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(secureSettings, 'getCredentials').resolves('pass');
      sinon.stub(request, 'post').resolves();

      return outbound.__get__('send')(payload, conf)
        .then(() => {
          assert.equal(secureSettings.getCredentials.callCount, 1);
          assert.equal(secureSettings.getCredentials.args[0][0], 'test-config');
          assert.equal(request.post.callCount, 1);
          assert.equal(request.post.args[0][0].url, 'http://test/foo');
          assert.deepEqual(request.post.args[0][0].body, {some: 'data'});
          assert.equal(request.post.args[0][0].json, true);
          assert.deepEqual(request.post.args[0][0].auth, {
            username: 'admin',
            password: 'pass',
            sendImmediately: true
          });
        });
    });

    it('should support pushing via header auth', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          auth: {
            type: 'Header',
            name: 'Authorization',
            value_key: 'test-config'
          },
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(secureSettings, 'getCredentials').resolves('Bearer credentials');
      sinon.stub(request, 'post').resolves();

      return outbound.__get__('send')(payload, conf)
        .then(() => {
          assert.equal(secureSettings.getCredentials.callCount, 1);
          assert.equal(secureSettings.getCredentials.args[0][0], 'test-config');
          assert.equal(request.post.callCount, 1);
          assert.equal(request.post.args[0][0].url, 'http://test/foo');
          assert.deepEqual(request.post.args[0][0].body, {some: 'data'});
          assert.equal(request.post.args[0][0].json, true);
          assert.deepEqual(request.post.args[0][0].headers, {
            Authorization: 'Bearer credentials'
          });
        });
    });
    
    it('should support Muso SIH custom auth', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          auth: {
            type: 'muso-sih',
            username: 'admin',
            password_key: 'test-config',
            path: '/login'
          },
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(secureSettings, 'getCredentials').resolves('pass');
      const post = sinon.stub(request, 'post');

      post.onCall(0).resolves({
        statut: 200,
        message: 'Requête traitée avec succès.',
        data: {
          username_token: 'j9NAhVDdVWkgo1xnbxA9V3Pmp'
        }
      });
      post.onCall(1).resolves();

      return outbound.__get__('send')(payload, conf)
        .then(() => {
          assert.equal(post.callCount, 2);

          assert.equal(post.args[0][0].form.login, 'admin');
          assert.equal(post.args[0][0].form.password, 'pass');
          assert.equal(post.args[0][0].url, 'http://test/login');

          assert.equal(post.args[1][0].url, 'http://test/foo');
          assert.deepEqual(post.args[1][0].body, {some: 'data'});
          assert.equal(post.args[1][0].json, true);
          assert.equal(post.args[1][0].qs.token, 'j9NAhVDdVWkgo1xnbxA9V3Pmp');
        });
    });

    it('should error if Muso SIH custom auth fails to return a 200', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        destination: {
          auth: {
            type: 'muso-sih',
            username: 'admin',
            password_key: 'test-config',
            path: '/login'
          },
          base_url: 'http://test',
          path: '/foo'
        }
      };

      sinon.stub(secureSettings, 'getCredentials').resolves('wrong pass');

      sinon.stub(request, 'post').resolves({
        statut: 404,
        message: 'Login/Mot de passe Incorrect !'
      });

      return outbound.__get__('send')(payload, conf)
        .then(() => {
          assert.fail('This send should have errored');
        })
        .catch(err => {
          assert.equal(err.message, 'Got 404 when requesting auth');
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
    let send;
    let sentinelPut;
    let sentinelGet;

    const restores = [];

    beforeEach(() => {
      const transitionsLib = {
        infodoc: sinon.stub()
      };
      sinon.stub(config, 'getTransitionsLib').returns(transitionsLib);

      mapDocumentToPayload = sinon.stub();
      restores.push(outbound.__set__('mapDocumentToPayload', mapDocumentToPayload));

      send = sinon.stub();
      restores.push(outbound.__set__('send', send));

      sentinelPut = sinon.stub(db.sentinel, 'put');
      sentinelGet = sinon.stub(db.sentinel, 'get');
    });

    afterEach(() => restores.forEach(restore => restore()));

    it('should create a outbound push out of the passed parameters, and update the infodoc and task if success', () => {
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
      sentinelGet.resolves(infoDoc);
      sentinelPut.onFirstCall().resolves({rev: '1-abc'});
      sentinelPut.resolves();

      return outbound.__get__('singlePush')(task, doc, config, 'test-push-1')
        .then(() => {
          assert.equal(task._deleted, true);
          assert.equal(task._rev, '1-abc');
          assert.equal(infoDoc.completed_tasks.length, 1);
          assert.include(infoDoc.completed_tasks[0], {
            type: 'outbound',
            name: 'test-push-1'
          });
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
      send.rejects({message: 'oh no!'});

      return outbound.__get__('singlePush')(task, doc, config, 'test-config-1')
        .then(() => {
          assert.equal(task.queue.length, 1);
          assert.equal(sentinelGet.callCount, 0);
          assert.equal(sentinelPut.callCount, 0);
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
      sentinelGet.resolves(infoDoc);
      sentinelPut.onFirstCall().resolves({rev: '1-abc'});
      sentinelPut.resolves();

      return outbound.__get__('singlePush')(task, doc, config, 'test-push-1')
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


      mapDocumentToPayload.throws(new Error('oh no!'));

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
      send.rejects(new Error('oh no!'));

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

  describe('execute', () => {
    let configGet;
    let queuedTasks;
    let singlePush;
    let removeInvalidTasks;
    const restores = [];

    beforeEach(() => {
      configGet = sinon.stub(config, 'get');

      queuedTasks = sinon.stub();
      restores.push(outbound.__set__('queuedTasks', queuedTasks));

      singlePush = sinon.stub();
      restores.push(outbound.__set__('singlePush', singlePush));

      removeInvalidTasks = sinon.stub();
      restores.push(outbound.__set__('removeInvalidTasks', removeInvalidTasks));
    });

    afterEach(() => restores.forEach(restore => restore()));

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

      configGet.returns(config);
      queuedTasks.resolves({
        validTasks: [{ task: task1, doc: doc1 }, { task: task2, doc: doc2 }],
        invalidTasks: [{task: task3, row: error3}]
      });

      removeInvalidTasks.resolves();

      singlePush.resolves();

      return outbound.__get__('execute')()
        .then(() => {
          assert.equal(configGet.callCount, 1);
          assert.equal(removeInvalidTasks.callCount, 1);
          assert.equal(singlePush.callCount, 2);

          assert.deepEqual(removeInvalidTasks.args[0][0], [{task: task3, row: error3}]);
          assert.deepEqual(singlePush.args[0], [task1, doc1, {some: 'config'}, 'test-push-1']);
          assert.deepEqual(singlePush.args[1], [task2, doc2, {other: 'config'}, 'test-push-2']);
        });
    });
  });
});
