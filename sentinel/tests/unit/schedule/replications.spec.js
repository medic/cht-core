const later = require('later');
const sinon = require('sinon');
const assert = require('chai').assert;
const rpn = require('request-promise-native');
const rewire = require('rewire');

const db = require('../../../src/db');
const replications = rewire('../../../src/schedule/replications');

describe('replications', () => {

  afterEach(() => {
    replications.__set__('timer', undefined);
    sinon.restore();
  });

  it('calls runReplication', () => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    const runReplication = sinon.stub(replications, 'runReplication');
    return replications.execute().then(() => {
      assert.equal(runReplication.callCount, 1);
    });
  });

  it('executes runReplication but does not start replicating if no matching dbs', () => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    const replicateDbs = sinon.stub(replications, 'replicateDbs');
    replicateDbs.returns(Promise.resolve());
    sinon.stub(db, 'allDbs').resolves(['a-b', 'a-s', 'a-x-1', 'a-x-2']);
    return replications.execute().then(() => {
      assert.equal(replicateDbs.callCount, 1);
      assert.deepEqual(replicateDbs.args[0][0], []);
    });
  });

  it('executes runReplication starts replicating matching dbs', () => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    const replicateDbs = sinon.stub(replications, 'replicateDbs');
    replicateDbs.returns(Promise.resolve());
    sinon.stub(db, 'allDbs')
      .resolves([
        'medic-b',
        'medic-s',
        `${db.medicDbName}-user-x-meta`,
        `${db.medicDbName}-user-y-meta`,
        `${db.medicDbName}-user-xx-yy-meta`
      ]);
    return replications.execute().then(() => {
      assert.equal(replicateDbs.callCount, 1);
      assert.deepEqual(replicateDbs.args[0][0], [
        `${db.medicDbName}-user-x-meta`,
        `${db.medicDbName}-user-y-meta`,
        `${db.medicDbName}-user-xx-yy-meta`
      ]);
      assert.equal(replicateDbs.args[0][1], `${db.medicDbName}-users-meta`);
    });
  });

  describe('replicateDbs', () => {
    let source;
    let target;

    beforeEach(() => {
      source = {
        replicate: { to: sinon.stub().resolves() },
        get: sinon.stub(),
        info: sinon.stub().resolves({}),
        changes: sinon.stub().resolves({ results: [] }),
        put: sinon.stub(),
      };
      target = {};
    });

    it('should replicate source to target', () => {
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source').returns(source);
      source.get.resolves({ seq: 10 });
      return replications.replicateDbs(['source'], 'target').then(() => {
        assert.equal(source.replicate.to.callCount, 1);
        assert.deepEqual(source.replicate.to.args[0][0], target);
        const options = source.replicate.to.args[0][1];
        assert.deepEqual(Object.keys(options), ['filter']);
        assert.isFunction(options.filter);
        assert.equal(source.get.callCount, 1);
        assert.deepEqual(source.get.args[0], ['_local/purge_log']);
      });
    });

    it('should only replicate feedback and telemetry docs', () => {
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source').returns(source);
      source.get.resolves({ seq: 10 });
      return replications.replicateDbs(['source'], 'target').then(() => {
        const filter = source.replicate.to.args[0][1].filter;

        assert.equal(filter({ _id: 'whatever' }), false);
        assert.equal(filter({ _id: 'read:report:something', _rev: 'a' }), false);
        assert.equal(filter({ _id: 'design/medic-user', _rev: 'a', views: { read: 'fn' } }), false);
        assert.equal(filter({ _id: 'feedback-2020-02-13-time-user', meta: { user: { name: 'admin' } } }), true);
        assert.equal(filter({ _id: 'telemetry-2020-02-admin-whatever', metrics: { search: {} } }), true);
        assert.equal(filter({ _id: 'telemotry-2020-02-admin-whatever', metrics: { search: {} } }), false);
        assert.equal(filter({ _id: 'telemetrised-2020-02-admin-whatever', metrics: { search: {} } }), false);
        assert.equal(filter({ _id: 'telemetryyyy-2020-02-admin-whatever', metrics: { search: {} } }), false);

        assert.equal(source.get.callCount, 1);
        assert.deepEqual(source.get.args[0], ['_local/purge_log']);
      });
    });

    it('should throw replication errors', () => {
      source.replicate.to.rejects({ some: 'err' });
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source1').returns(source);
      db.get.withArgs('source2').returns(source);
      return replications
        .replicateDbs(['source1', 'source2'], 'target')
        .then(() => assert.fail('should have thrown'))
        .catch((err) => {
          assert.deepEqual(err, { some: 'err' });
          assert.equal(source.replicate.to.callCount, 1);
          assert.equal(db.get.callCount, 3);
          assert.deepEqual(db.get.args, [['target'], ['source1'], ['source2']]);

          assert.equal(source.get.callCount, 0);
        });
    });

    it('should close all dbs at the end', () => {
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source1').returns(source);
      db.get.withArgs('source2').returns(source);
      db.get.withArgs('source3').returns(source);
      source.get.resolves({ seq: 10 });
      return replications.replicateDbs(['source1', 'source2', 'source3'], 'target').then(() => {
        assert.equal(source.replicate.to.callCount, 3);
        assert.equal(db.get.callCount, 4);
        assert.deepEqual(db.get.args, [['target'], ['source1'], ['source2'], ['source3']]);
        assert.equal(db.close.callCount, 4);
        assert.deepEqual(db.close.args, [[source], [source], [source], [target]]);

        assert.equal(source.get.callCount, 3);
        assert.deepEqual(source.get.args, [['_local/purge_log'], ['_local/purge_log'], ['_local/purge_log']]);
      });
    });

    describe('purging', () => {
      it('should start purging changes from start when no log', () => {
        sinon.stub(db, 'get');
        sinon.stub(db, 'close');
        target.changes = sinon.stub();
        db.get.withArgs('target').returns(target);
        source.changes = sinon.stub();
        source.put = sinon.stub();
        source.get.rejects({ status: 404 });
        source.info = sinon.stub().resolves({ db_name: 'source', update_seq: 400 });
        db.get.withArgs('source').returns(source);

        const changes = [
          {
            last_seq: 100,
            results: [
              { id: 'telemetry-1', changes: [{ rev: '1' }] },
              { id: 'read:doc', changes: [{ rev: '2' }] },
              { id: 'something', changes: [{ rev: '3' }] },
              { id: 'feedback-1', changes: [{ rev: '4' }] },
            ],
          },
          {
            last_seq: 200,
            results: [
              { id: 'feedback-2', changes: [{ rev: '2' }] },
              { id: 'feedback-3', changes: [{ rev: '11' }] },
              { id: 'telemetry-3', changes: [{ rev: '1' }] },
            ],
          },
          {
            last_seq: 300,
            results: [
              { id: 'something', changes: [{ rev: '4' }] },
              { id: 'read:doc2', changes: [{ rev: '5' }] },
              { id: 'read:doc3', changes: [{ rev: '6' }] },
            ],
          },
          {
            last_seq: 400,
            results: [
              { id: 'telemetry-4', changes: [{ rev: '1' }] },
              { id: 'telemetry-5', changes: [{ rev: '1' }] },
              { id: 'read:doc3', changes: [{ rev: '6' }] },
            ],
          },
          { last_seq: 400, results: [] },
        ];

        source.changes.callsFake(() => Promise.resolve(changes.splice(0, 1)[0]));
        // presume all docs are already replicated
        target.changes.callsFake(({ doc_ids }) => Promise.resolve({ results: doc_ids.map(id => ({ id })) }));
        sinon.stub(rpn, 'post').resolves();

        return replications.replicateDbs(['source'], 'target').then(() => {
          assert.equal(source.get.callCount, 1);
          assert.deepEqual(source.get.args[0], ['_local/purge_log']);
          assert.equal(source.changes.callCount, 5);
          assert.deepEqual(source.changes.args[0], [{ since: 0, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[1], [{ since: 100, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[2], [{ since: 200, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[3], [{ since: 300, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[4], [{ since: 400, limit: 100, batch_size: 100 }]);
          assert.equal(rpn.post.callCount, 3);
          assert.deepEqual(rpn.post.args[0], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'telemetry-1': ['1'],
              'feedback-1': ['4'],
            }
          }]);
          assert.deepEqual(rpn.post.args[1], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'feedback-2': ['2'],
              'feedback-3': ['11'],
              'telemetry-3': ['1'],
            }
          }]);
          assert.deepEqual(rpn.post.args[2], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'telemetry-4': ['1'],
              'telemetry-5': ['1'],
            }
          }]);

          assert.equal(target.changes.callCount, 3);
          assert.deepEqual(target.changes.args[0], [{ doc_ids: ['telemetry-1', 'feedback-1'] }]);
          assert.deepEqual(target.changes.args[1], [{ doc_ids: ['feedback-2', 'feedback-3', 'telemetry-3'] }]);
          assert.deepEqual(target.changes.args[2], [{ doc_ids: ['telemetry-4', 'telemetry-5'] }]);

          assert.equal(source.put.callCount, 1);
          assert.deepEqual(source.put.args[0], [{ _id: '_local/purge_log', seq: 400 }]);
        });
      });

      it('should not purge anything when no changes', () => {
        sinon.stub(db, 'get');
        sinon.stub(db, 'close');
        target.changes = sinon.stub();
        db.get.withArgs('target').returns(target);
        source.get.resolves({ _id: '_local/purge_log', seq: 100 });
        source.info.resolves({ db_name: 'source', update_seq: 100 });
        db.get.withArgs('source').returns(source);

        source.changes.resolves({ results: [] });

        return replications.replicateDbs(['source'], 'target').then(() => {
          assert.equal(source.get.callCount, 1);
          assert.deepEqual(source.get.args[0], ['_local/purge_log']);
          assert.equal(source.changes.callCount, 1);
          assert.deepEqual(source.changes.args[0], [{ since: 100, limit: 100, batch_size: 100 }]);

          assert.equal(target.changes.callCount, 0);
          assert.equal(source.put.callCount, 1);
          assert.deepEqual(source.put.args[0], [{ _id: '_local/purge_log', seq: 100 }]);
        });
      });

      it('should batch changes and purge all replicated feedback and telemetry docs', () => {
        sinon.stub(db, 'get');
        sinon.stub(db, 'close');
        target.changes = sinon.stub();
        db.get.withArgs('target').returns(target);
        source.changes = sinon.stub();
        source.put = sinon.stub();
        source.get.resolves({ _id: '_local/purge_log', seq: 100 });
        source.info = sinon.stub().resolves({ db_name: 'source', update_seq: 500 });
        db.get.withArgs('source').returns(source);

        const changes = [
          {
            last_seq: 200,
            results: [
              { id: 'telemetry-1', changes: [{ rev: '1' }] },
              { id: 'read:doc', changes: [{ rev: '2' }] },
              { id: 'something', changes: [{ rev: '3' }] },
              { id: 'feedback-1', changes: [{ rev: '4' }] },
            ],
          },
          {
            last_seq: 300,
            results: [
              { id: 'feedback-2', changes: [{ rev: '2' }] },
              { id: 'feedback-3', changes: [{ rev: '11' }] },
              { id: 'telemetry-3', changes: [{ rev: '1' }] },
            ],
          },
          {
            last_seq: 400,
            results: [
              { id: 'something', changes: [{ rev: '4' }] },
              { id: 'read:doc2', changes: [{ rev: '5' }] },
              { id: 'read:doc3', changes: [{ rev: '6' }] },
            ],
          },
          {
            last_seq: 500,
            results: [
              { id: 'telemetry-4', changes: [{ rev: '1' }] },
              { id: 'telemetry-5', changes: [{ rev: '1' }] },
              { id: 'read:doc3', changes: [{ rev: '6' }] },
            ],
          },
          { last_seq: 500, results: [] },
        ];

        source.changes.callsFake(() => Promise.resolve(changes.splice(0, 1)[0]));
        // presume all docs are already replicated
        target.changes.callsFake(({ doc_ids }) => Promise.resolve({ results: doc_ids.map(id => ({ id })) }));
        sinon.stub(rpn, 'post').resolves();

        return replications.replicateDbs(['source'], 'target').then(() => {
          assert.equal(source.get.callCount, 1);
          assert.deepEqual(source.get.args[0], ['_local/purge_log']);
          assert.equal(source.changes.callCount, 5);
          assert.deepEqual(source.changes.args[0], [{ since: 100, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[1], [{ since: 200, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[2], [{ since: 300, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[3], [{ since: 400, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[4], [{ since: 500, limit: 100, batch_size: 100 }]);
          assert.equal(rpn.post.callCount, 3);
          assert.deepEqual(rpn.post.args[0], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'telemetry-1': ['1'],
              'feedback-1': ['4'],
            }
          }]);
          assert.deepEqual(rpn.post.args[1], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'feedback-2': ['2'],
              'feedback-3': ['11'],
              'telemetry-3': ['1'],
            }
          }]);
          assert.deepEqual(rpn.post.args[2], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'telemetry-4': ['1'],
              'telemetry-5': ['1'],
            }
          }]);

          assert.equal(target.changes.callCount, 3);
          assert.deepEqual(target.changes.args[0], [{ doc_ids: ['telemetry-1', 'feedback-1'] }]);
          assert.deepEqual(target.changes.args[1], [{ doc_ids: ['feedback-2', 'feedback-3', 'telemetry-3'] }]);
          assert.deepEqual(target.changes.args[2], [{ doc_ids: ['telemetry-4', 'telemetry-5'] }]);

          assert.equal(source.put.callCount, 1);
          assert.deepEqual(source.put.args[0], [{ _id: '_local/purge_log', seq: 500 }]);
        });
      });

      it('should only purge docs that have been replicated', () => {
        sinon.stub(db, 'get');
        sinon.stub(db, 'close');
        target.changes = sinon.stub();
        db.get.withArgs('target').returns(target);
        source.changes = sinon.stub();
        source.put = sinon.stub();
        source.get.rejects({ status: 404 });
        source.info = sinon.stub().resolves({ db_name: 'source', update_seq: 200 });
        db.get.withArgs('source').returns(source);

        const changes = [
          {
            last_seq: 100,
            results: [
              { id: 'telemetry-1', changes: [{ rev: '1' }] },
              { id: 'read:doc', changes: [{ rev: '2' }] },
              { id: 'something', changes: [{ rev: '3' }] },
              { id: 'feedback-1', changes: [{ rev: '4' }] },
            ],
          },
          {
            last_seq: 200,
            results: [
              { id: 'feedback-2', changes: [{ rev: '2' }] },
              { id: 'feedback-3', changes: [{ rev: '11' }] },
              { id: 'telemetry-3', changes: [{ rev: '1' }] },
            ],
          },
          { last_seq: 220, results: [
            { id: 'read:doc:2', changes: [{ rev: '2' }] },
            { id: 'something:2', changes: [{ rev: '3' }] },
          ] },
          { last_seq: 220, results: [] },
        ];

        source.changes.callsFake(() => Promise.resolve(changes.splice(0, 1)[0]));
        // presume all docs are already replicated
        const replicatedIds = ['telemetry-1', 'feedback-1', 'feedback-2'];
        target.changes.callsFake(({ doc_ids }) => (
          Promise.resolve({ results: doc_ids.filter(id => replicatedIds.includes(id)).map(id => ({ id })) })));
        sinon.stub(rpn, 'post').resolves();

        return replications.replicateDbs(['source'], 'target').then(() => {
          assert.equal(source.get.callCount, 1);
          assert.deepEqual(source.get.args[0], ['_local/purge_log']);
          assert.equal(source.changes.callCount, 4);
          assert.deepEqual(source.changes.args[0], [{ since: 0, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[1], [{ since: 100, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[2], [{ since: 200, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[3], [{ since: 220, limit: 100, batch_size: 100 }]);
          assert.equal(rpn.post.callCount, 2);
          assert.deepEqual(rpn.post.args[0], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'telemetry-1': ['1'],
              'feedback-1': ['4'],
            }
          }]);
          assert.deepEqual(rpn.post.args[1], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'feedback-2': ['2'],
            }
          }]);

          assert.equal(target.changes.callCount, 2);
          assert.deepEqual(target.changes.args[0], [{ doc_ids: ['telemetry-1', 'feedback-1'] }]);
          assert.deepEqual(target.changes.args[1], [{ doc_ids: ['feedback-2', 'feedback-3', 'telemetry-3'] }]);

          assert.equal(source.put.callCount, 1);
          assert.deepEqual(source.put.args[0], [{ _id: '_local/purge_log', seq: 200 }]);
        });
      });

      it('should interrupt when an error is thrown', () => {
        sinon.stub(db, 'get');
        sinon.stub(db, 'close');
        target.changes = sinon.stub();
        db.get.withArgs('target').returns(target);
        source.changes = sinon.stub();
        source.put = sinon.stub();
        source.get.rejects({ status: 404 });
        source.info = sinon.stub().resolves({ db_name: 'source' });
        db.get.withArgs('source').returns(source);

        const changes = [
          {
            last_seq: 100,
            results: [
              { id: 'telemetry-1', changes: [{ rev: '1' }] },
              { id: 'read:doc', changes: [{ rev: '2' }] },
              { id: 'something', changes: [{ rev: '3' }] },
              { id: 'feedback-1', changes: [{ rev: '4' }] },
            ],
          },
          {
            last_seq: 200,
            results: [
              { id: 'feedback-2', changes: [{ rev: '2' }] },
              { id: 'feedback-3', changes: [{ rev: '11' }] },
              { id: 'telemetry-3', changes: [{ rev: '1' }] },
            ],
          },
          {
            last_seq: 300,
            results: [
              { id: 'something', changes: [{ rev: '4' }] },
              { id: 'read:doc2', changes: [{ rev: '5' }] },
              { id: 'read:doc3', changes: [{ rev: '6' }] },
            ],
          },
          {
            last_seq: 400,
            results: [
              { id: 'telemetry-4', changes: [{ rev: '1' }] },
              { id: 'telemetry-5', changes: [{ rev: '1' }] },
              { id: 'read:doc3', changes: [{ rev: '6' }] },
            ],
          },
          { last_seq: 400, results: [] },
        ];

        source.changes.callsFake(() => Promise.resolve(changes.splice(0, 1)[0]));
        // presume all docs are already replicated
        target.changes.callsFake(({ doc_ids }) => Promise.resolve({ results: doc_ids.map(id => ({ id })) }));
        sinon.stub(rpn, 'post').onCall(0).resolves().onCall(1).rejects({ some: 'error' });

        return replications
          .replicateDbs(['source'], 'target')
          .then(() => assert.fail('should have thrown'))
          .catch((err) => {
            assert.deepEqual(err, { some: 'error' });
            assert.equal(source.get.callCount, 1);
            assert.deepEqual(source.get.args[0], ['_local/purge_log']);
            assert.equal(source.changes.callCount, 2);
            assert.deepEqual(source.changes.args[0], [{ since: 0, limit: 100, batch_size: 100 }]);
            assert.deepEqual(source.changes.args[1], [{ since: 100, limit: 100, batch_size: 100 }]);
            assert.equal(rpn.post.callCount, 2);
            assert.deepEqual(rpn.post.args[0], [{
              uri: `${db.serverUrl}/source/_purge`,
              json: true,
              body: {
                'telemetry-1': ['1'],
                'feedback-1': ['4'],
              }
            }]);
            assert.deepEqual(rpn.post.args[1], [{
              uri: `${db.serverUrl}/source/_purge`,
              json: true,
              body: {
                'feedback-2': ['2'],
                'feedback-3': ['11'],
                'telemetry-3': ['1'],
              }
            }]);

            assert.equal(source.put.callCount, 0);
          });
      });
    });
  });
});
