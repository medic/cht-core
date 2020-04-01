const _ = require('lodash');
const later = require('later');
const sinon = require('sinon');
const assert = require('chai').assert;
const config = require('../../src/config');
const replications = require('../../src/schedule/replications');
const db = require('../../src/db');
const rpn = require('request-promise-native');

describe('replications', () => {
  afterEach(() => sinon.restore());

  it('replications#execute is function', () => {
    assert(_.isFunction(replications.execute));
  });

  it('config with no replications calls callback', done => {
    sinon.stub(config, 'get').returns([]);
    sinon.stub(replications, 'runReplication').throws();
    replications.execute(err => {
      assert.equal(err, null);
      done();
    });
  });

  it('config with invalid replication throws error', done => {
    sinon.stub(config, 'get').returns([{fromSuffix:'x', cron:1, toSuffix:'x'}]);
    const runReplication = sinon.stub(replications, 'runReplication');
    assert.throws(() => replications.execute(), 'Invalid replication config with fromSuffix = \'x\', ' +
      'toSuffix = \'x\', text expression = \'undefined\' and cron = \'1\'');
    assert.equal(runReplication.callCount, 0);
    done();
  });

  it('config with three matching replications calls runReplication thrice', done => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    sinon.stub(config, 'get').returns([
      {fromSuffix:'x', cron:'x', toSuffix:'x'},
      {fromSuffix:'y', cron:'y', toSuffix:'y'},
      {fromSuffix:'z', cron:'z', toSuffix:'z'}
    ]);
    const runReplication = sinon.stub(replications, 'runReplication');
    replications.execute(err => {
      assert.equal(err, null);
      assert.equal(runReplication.callCount, 3);
      done();
    });
  });

  it('executes runReplication but does not start replicating if no matching dbs', done => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    sinon.stub(config, 'get').returns([
      {fromSuffix:'x', cron:'y', toSuffix:'z'}
    ]);
    const replicateDbs = sinon.stub(replications, 'replicateDbs');
    replicateDbs.returns(Promise.resolve());
    sinon.stub(db, 'allDbs').resolves(['a-b', 'a-s', 'a-x-1', 'a-x-2']);
    replications.execute(err => {
      assert.equal(err, null);
      assert.equal(replicateDbs.callCount, 1);
      assert.deepEqual(replicateDbs.args[0][0], []);
      done();
    });
  });

  it('executes runReplication starts replicating matching dbs', done => {
    sinon.stub(later, 'setInterval').callsArgWith(0).returns({ clear: sinon.stub() });
    sinon.stub(config, 'get').returns([
      {fromSuffix:'x', cron:'y', toSuffix:'z'}
    ]);
    const replicateDbs = sinon.stub(replications, 'replicateDbs');
    replicateDbs.returns(Promise.resolve());
    sinon.stub(db, 'allDbs').resolves(['medic-b', 'medic-s', `${db.medicDbName}-x-1`, `${db.medicDbName}-x-2`]);
    replications.execute(err => {
      assert.equal(err, null);
      assert.equal(replicateDbs.callCount, 1);
      assert.deepEqual(replicateDbs.args[0][0], [`${db.medicDbName}-x-1`, `${db.medicDbName}-x-2`]);
      assert.equal(replicateDbs.args[0][1], `${db.medicDbName}-z`);
      done();
    });
  });

  describe('replicateDbs', () => {
    let source;
    let events;
    let target;
    let replicationResult;

    beforeEach(() => {
      events = {};
      replicationResult = Promise.resolve();
      const rescursiveOn = sinon.stub();
      rescursiveOn.callsFake((event, cb) => {
        events[event] = cb;
        const promise = replicationResult;
        promise.on = rescursiveOn;
        return promise;
      });

      source = {
        replicate: { to: sinon.stub() },
        get: sinon.stub(),
      };
      source.replicate.to.returns({ on: rescursiveOn });
      target = {};
    });

    it('should replicate source to target', () => {
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source').returns(source);
      source.get.resolves();
      return replications.replicateDbs(['source'], 'target').then(() => {
        assert.equal(source.replicate.to.callCount, 1);
        assert.deepEqual(source.replicate.to.args[0][0], target);
        const options = source.replicate.to.args[0][1];
        assert.deepEqual(Object.keys(options), ['filter']);
        assert.isFunction(options.filter);
      });
    });

    it('should only replicate feedback and telemetry docs', () => {
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source').returns(source);
      source.get.resolves();
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
      });
    });

    it('should throw replication errors', () => {
      replicationResult = Promise.reject({ some: 'err' });
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source1').returns(source);
      db.get.withArgs('source2').returns(source);
      source.get.resolves();
      return replications
        .replicateDbs(['source1', 'source2'], 'target')
        .then(() => assert.fail('should have thrown'))
        .catch((err) => {
          assert.deepEqual(err, { some: 'err' });
          assert.equal(source.replicate.to.callCount, 1);
          assert.equal(db.get.callCount, 3);
          assert.deepEqual(db.get.args, [['target'], ['source1'], ['source2']]);
        });
    });

    it('should close all dbs at the end', () => {
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source1').returns(source);
      db.get.withArgs('source2').returns(source);
      db.get.withArgs('source3').returns(source);
      source.get.resolves();
      return replications.replicateDbs(['source1', 'source2', 'source3'], 'target').then(() => {
        assert.equal(source.replicate.to.callCount, 3);
        assert.equal(db.get.callCount, 4);
        assert.deepEqual(db.get.args, [['target'], ['source1'], ['source2'], ['source3']]);
        assert.equal(db.close.callCount, 4);
        assert.deepEqual(db.close.args, [[source], [source], [source], [target]]);
      });
    });

    it('should purge all replicated docs', () => {
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source').returns(source);
      sinon.stub(rpn, 'post').resolves();
      source.get.resolves();
      source.info = sinon.stub().resolves({ db_name: 'source' });

      return replications.replicateDbs(['source'], 'target').then(() => {
        const docs = [
          { _id: 'feedback1', _rev: 'rev1', some: 'data' },
          { _id: 'feedback2', _rev: 'rev2', some: 'data' },
          { _id: 'telemetry1', _rev: 'rev3', some: 'data' },
          { _id: 'feedback3', _rev: 'rev4', some: 'data' },
          { _id: 'feedback4', _rev: 'rev5', some: 'data' },
        ];

        return events['change']({ docs }).then(() => {
          assert.equal(rpn.post.callCount, 1);
          assert.equal(source.info.callCount, 1);
          assert.deepEqual(rpn.post.args[0], [{
            uri: `${db.serverUrl}/source/_purge`,
            json: true,
            body: {
              'feedback1': ['rev1'],
              'feedback2': ['rev2'],
              'telemetry1': ['rev3'],
              'feedback3': ['rev4'],
              'feedback4': ['rev5'],
            }
          }]);
        });
      });
    });

    it('should not call purge when no docs', () => {
      sinon.stub(db, 'get');
      sinon.stub(db, 'close');
      db.get.withArgs('target').returns(target);
      db.get.withArgs('source').returns(source);
      source.info = sinon.stub().resolves({ db_name: 'source' });
      source.get.resolves();
      return replications.replicateDbs(['source'], 'target').then(() => {
        return events['change']({ }).then(() => {
          assert.equal(source.info.callCount, 0);
        });
      });
    });

    describe('oneTimePurge', () => {
      it('should not run oneTimePurge if already ran', () => {
        sinon.stub(db, 'get');
        sinon.stub(db, 'close');
        db.get.withArgs('target').returns(target);
        source.changes = sinon.stub();
        db.get.withArgs('source').returns(source);
        source.get.resolves({ _id: '_local/one_time_purge' });

        return replications.replicateDbs(['source'], 'target').then(() => {
          assert.equal(source.get.callCount, 1);
          assert.deepEqual(source.get.args[0], ['_local/one_time_purge']);
          assert.equal(source.changes.callCount, 0);
        });
      });

      it('should batch changes and purge all replicated feedback and telemetry docs', () => {
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
        sinon.stub(rpn, 'post').resolves();

        return replications.replicateDbs(['source'], 'target').then(() => {
          assert.equal(source.get.callCount, 1);
          assert.deepEqual(source.get.args[0], ['_local/one_time_purge']);
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
          assert.deepEqual(source.put.args[0], [{ _id: '_local/one_time_purge' }]);
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
          { last_seq: 200, results: [] },
        ];

        source.changes.callsFake(() => Promise.resolve(changes.splice(0, 1)[0]));
        // presume all docs are already replicated
        const replicatedIds = ['telemetry-1', 'feedback-1', 'feedback-2'];
        target.changes.callsFake(({ doc_ids }) => (
          Promise.resolve({ results: doc_ids.filter(id => replicatedIds.includes(id)).map(id => ({ id })) }))
        );
        sinon.stub(rpn, 'post').resolves();

        return replications.replicateDbs(['source'], 'target').then(() => {
          assert.equal(source.get.callCount, 1);
          assert.deepEqual(source.get.args[0], ['_local/one_time_purge']);
          assert.equal(source.changes.callCount, 3);
          assert.deepEqual(source.changes.args[0], [{ since: 0, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[1], [{ since: 100, limit: 100, batch_size: 100 }]);
          assert.deepEqual(source.changes.args[2], [{ since: 200, limit: 100, batch_size: 100 }]);
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
          assert.deepEqual(source.put.args[0], [{ _id: '_local/one_time_purge' }]);
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
            assert.deepEqual(source.get.args[0], ['_local/one_time_purge']);
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
