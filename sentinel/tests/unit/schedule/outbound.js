const assert = require('chai').assert;
const sinon = require('sinon');

const config = require('../../../src/config'),
      db = require('../../../src/db');

const rewire = require('rewire');
const outbound = rewire('../../../src/schedule/outbound');

describe('outbound', () => {
  beforeEach(() => sinon.restore());

  describe('queued', () => {
    let lineage;
    beforeEach(() => {
      lineage = sinon.stub();
      outbound.__set__('lineage', {hydrateDocs: lineage});
    });

    afterEach(() => {
      sinon.restore();
    });

    it('gets all queues and associated docs', () => {
      const queue = {
        _id: 'task:outbound:some_doc_id',
        doc_id: 'some_doc_id',
        queue: ['some', 'queue']
      };
      const doc = {
        _id: 'some_doc_id',
        some: 'data'
      };

      const dbSentinelAllDocs = sinon.stub(db.sentinel, 'allDocs');
      const dbMedicAllDocs = sinon.stub(db.medic, 'allDocs');

      dbSentinelAllDocs.resolves({
        rows: [{
          doc: queue
        }]
      });

      dbMedicAllDocs.resolves({
        rows: [{
          doc: doc
        }]
      });

      lineage.resolves([doc]);

      return outbound._queued()
        .then(results => {
          assert.deepEqual(results, [
            [queue, doc]
          ]);
        });
    });
  });
  describe('mapping', () => {
    it('supports simple dest => src mapping', () => {
      const doc = {
        _id: 'test-doc',
        foo: 42,
        bar: 'baaa'
      };

      const conf = {
        key: 'test-config',
        mapping: {
          'api_foo': 'doc.foo',
          'bar': 'doc.bar'
        }
      };

      assert.deepEqual(outbound._map(doc, conf), {
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
        key: 'test-config',
        mapping: {
          'when': 'doc.reported_date',
          'data.the_foo': 'doc.fields.foo'
        }
      };

      assert.deepEqual(outbound._map(doc, conf), {
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
        key: 'test-config',
        mapping: {
          'foo': 'doc.fields.foo'
        }
      };

      assert.throws(() => outbound._map(doc, conf), 'Mapping error for test-config/foo');
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
        key: 'test-config',
        mapping: {
          'foo': {
            path: 'doc.fields.foo',
            optional: true
          },
          'bar': 'doc.fields.bar'
        }
      };

      assert.deepEqual(outbound._map(doc, conf), {
        bar: 42
      });
    });
    it('supports basic awkward data conversion via arbitrary expressions', () => {
      const doc = {
        _id: 'test-doc',
        fields: {
          a_list: ['a', 'b', 'c', 'd'],
          foo: 'Yes',
        }
      };

      const conf = {
        key: 'test-config',
        mapping: {
          'list_count': {expr: 'doc.fields.a_list.length'},
          'foo': {expr: 'doc.fields.foo === \'Yes\''},
        }
      };
      assert.deepEqual(outbound._map(doc, conf), {
        list_count: 4,
        foo: true
      });
    });
  });
  describe('push', () => {
    let request;
    beforeEach(() => {
      request = sinon.stub();
      outbound.__set__('request', request);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should push on minimal configuration', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        key: 'test-config',
        destination: {
          base_url: 'http://test',
          path: '/foo'
        }
      };

      request.resolves();

      return outbound._send(payload, conf)
        .then(() => {
          assert.equal(request.callCount, 1);
          assert.equal(request.args[0][0].method, 'POST');
          assert.equal(request.args[0][0].url, 'http://test/foo');
          assert.deepEqual(request.args[0][0].body, {some: 'data'});
          assert.equal(request.args[0][0].json, true);
        });
    });
    it('should support pushing via basic auth', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        key: 'test-config',
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

      request.onCall(0).resolves('"pass"\n');
      request.onCall(1).resolves();

      return outbound._send(payload, conf)
        .then(() => {
          assert.equal(request.callCount, 2);
          assert.equal(request.args[1][0].method, 'POST');
          assert.equal(request.args[1][0].url, 'http://test/foo');
          assert.deepEqual(request.args[1][0].body, {some: 'data'});
          assert.equal(request.args[1][0].json, true);
          assert.deepEqual(request.args[1][0].auth, {
            username: 'admin',
            password: 'pass',
            sendImmediately: true
          });
        });
    });
    it('should support Muso SIH custom auth', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        key: 'test-config',
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

      request.onCall(0).resolves('"pass"\n');
      request.onCall(1).resolves({
        statut: 200,
        message: 'Requête traitée avec succès.',
        data: {
          username_token: 'j9NAhVDdVWkgo1xnbxA9V3Pmp'
        }
      });
      request.onCall(2).resolves();

      return outbound._send(payload, conf)
        .then(() => {
          assert.equal(request.callCount, 3);

          assert.equal(request.args[1][0].form.login, 'admin');
          assert.equal(request.args[1][0].form.password, 'pass');
          assert.equal(request.args[1][0].url, 'http://test/login');

          assert.equal(request.args[2][0].method, 'POST');
          assert.equal(request.args[2][0].url, 'http://test/foo');
          assert.deepEqual(request.args[2][0].body, {some: 'data'});
          assert.equal(request.args[2][0].json, true);
          assert.equal(request.args[2][0].qs.token, 'j9NAhVDdVWkgo1xnbxA9V3Pmp');
        });
    });
    it('should error is Muso SIH custom auth fails to return a 200', () => {
      const payload = {
        some: 'data'
      };

      const conf = {
        key: 'test-config',
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

      request.onCall(0).resolves('"wrong pass"\n');
      request.onCall(1).resolves({
        statut: 404,
        message: 'Login/Mot de passe Incorrect !'
      });

      return outbound._send(payload, conf)
        .then(() => {
          assert.fail('This send should have errored');
        })
        .catch(err => {
          assert.equal(err.message, 'Got 404 when requesting auth');
        });
    });
  });
  describe('collect, which takes a queue for a doc and collects pushes to try', () => {
    it('should return empty for no valid pushes', () => {
      const config = [{
        key: 'test-push-1'
      },
      {
        key: 'test-push-2'
      }];

      const queue = {
        _id: 'task:outbound:some_doc_id',
        queue: []
      };

      assert.deepEqual(
        outbound._collect(config, queue),
        []
      );
    });
    it('should return pushes to attempt', () => {
      const config = [{
        key: 'test-push-1',
        some: 'more config'
      },
      {
        key: 'test-push-2'
      }];

      const queue = {
        _id: 'task:outbound:some_doc_id',
        queue: ['test-push-1']
      };

      assert.deepEqual(
        outbound._collect(config, queue),
        [{key: 'test-push-1', some: 'more config'}]
      );
    });
  });
  describe('coordination', () => {
    let configGet,
        dbSentinelBulkDocs,
        queued, map, send, collect;

    beforeEach(() => {
      configGet = sinon.stub(config, 'get');
      dbSentinelBulkDocs = sinon.stub(db.sentinel, 'bulkDocs');
      map = sinon.stub(outbound, '_map');
      queued = sinon.stub(outbound, '_queued');
      send = sinon.stub(outbound, '_send');
      collect = sinon.stub(outbound, '_collect');
    });

    it('should find docs with outbound queues; collect, map and send them; removing those that are successful', () => {
      const config = {
        'test-push-1': {
          some: 'config'
        }
      };

      const collected = [{
        key: 'test-push-1',
        some: 'config'
      }];

      const queue1 = {
        _id: 'task:outbound:test-doc-1',
        doc_id: 'test-doc-1',
        queue: ['test-push-1']
      };
      const queue2 = {
        _id: 'task:outbound:test-doc-2',
        doc_id: 'test-doc-2',
        queue: ['test-push-2']
      };

      const doc1 = {
        _id: 'test-doc-1', some: 'data-1'
      };
      const doc2 = {
        _id: 'test-doc-2', some: 'data-2'
      };

      queued.resolves([[queue1, doc1], [queue2, doc2]]);
      configGet.returns(config);
      collect.returns(collected);
      map.returns({map: 'called'});
      send.onCall(0).resolves(); // test-doc-1's push succeeds
      send.onCall(1).rejects(); // but test-doc-2's push fails, so...
      dbSentinelBulkDocs.resolves();

      return outbound._execute()
        .then(() => {
          assert.equal(configGet.callCount, 1);
          assert.equal(dbSentinelBulkDocs.callCount, 1);
          // ... only the first doc has changed...
          assert.equal(dbSentinelBulkDocs.args[0][0][0]._id, 'task:outbound:test-doc-1');
          assert.equal(dbSentinelBulkDocs.args[0][0][0]._deleted, true);
          // (test-doc-2 has not been touched and would be tried again next time)
        });
    });
  });
});
