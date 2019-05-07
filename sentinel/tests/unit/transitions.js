const sinon = require('sinon'),
  assert = require('chai').assert,
  db = require('../../src/db'),
  transitions = require('../../src/transitions'),
  config = require('../../src/config'),
  metadata = require('../../src/lib/metadata'),
  tombstoneUtils = require('@medic/tombstone-utils');

config.initTransitionLib();
const infodoc = config.getTransitionsLib().infodoc;

describe('transitions', () => {
  afterEach(() => {
    transitions._changeQueue.kill();
    transitions._detach();
    sinon.restore();
  });

  it('loadTransitions load throws detach is called', () => {
    const load = sinon.stub(transitions._transitionsLib, 'loadTransitions').throws();
    const attach = sinon.stub(transitions, '_attach');
    const detach = sinon.stub(transitions, '_detach');
    transitions.loadTransitions();
    assert.equal(load.callCount, 1);
    assert.equal(attach.callCount, 0);
    assert.equal(detach.callCount, 1);
  });

  it('attach handles missing meta data doc', done => {
    sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
    sinon.stub(db.medic, 'get').rejects({ status: 404 });

    const insert = sinon.stub(db.sentinel, 'put').resolves({});

    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(db.medic, 'changes').returns({ on: on });

    const processChange = sinon.stub(transitions._transitionsLib, 'processChange').callsArg(1);
    // wait for the queue processor
    transitions._changeQueue.drain = () => {
      assert.equal(processChange.callCount, 1);
      assert.equal(processChange.args[0][0].id, 'abc');
      assert.equal(processChange.args[0][0].seq, 55);
      assert.equal(insert.callCount, 1);
      assert.equal(insert.args[0][0]._id, '_local/sentinel-meta-data');
      assert.equal(insert.args[0][0].processed_seq, 55);
      done();
    };
    transitions._attach().then(() => {
      assert.equal(feed.callCount, 1);
      assert.equal(feed.args[0][0].since, 0);
      // invoke the change handler
      on.args[0][1]({ id: 'abc', seq: 55 });
    });
  });

  it('attach handles old meta data doc', done => {
    const sentinelGet = sinon.stub(db.sentinel, 'get');
    sentinelGet.withArgs('_local/sentinel-meta-data').rejects({ status: 404 });

    const medicGet = sinon.stub(db.medic, 'get');
    medicGet.withArgs('_local/sentinel-meta-data').rejects({ status: 404 });
    medicGet
      .withArgs('sentinel-meta-data')
      .resolves({
        _id: 'sentinel-meta-data',
        _rev: '1-123',
        processed_seq: 22,
      });

    sinon.stub(infodoc, 'get').resolves({});
    const medicPut = sinon.stub(db.medic, 'put').resolves({});
    const sentinelPut = sinon.stub(db.sentinel, 'put').resolves({});
    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(db.medic, 'changes').returns({ on: on });
    const processChange = sinon.stub(transitions._transitionsLib, 'processChange').callsArg(1);
    // wait for the queue processor
    transitions._changeQueue.drain = () => {
      assert.equal(sentinelGet.callCount, 2);
      assert.equal(medicGet.callCount, 4);
      assert.equal(processChange.callCount, 1);
      assert.equal(processChange.args[0][0].id, 'abc');
      assert.equal(processChange.args[0][0].seq, 55);

      assert.equal(medicPut.callCount, 2);
      assert.equal(medicPut.args[0][0]._id, 'sentinel-meta-data');
      assert.equal(medicPut.args[0][0]._rev, '1-123');
      assert.equal(medicPut.args[0][0]._deleted, true);
      assert.equal(medicPut.args[1][0]._id, '_local/sentinel-meta-data');
      assert.equal(sentinelPut.callCount, 1);
      assert.equal(sentinelPut.args[0][0]._id, '_local/sentinel-meta-data');
      assert.equal(sentinelPut.args[0][0].processed_seq, 55);
      done();
    };
    transitions._attach().then(() => {
      assert.equal(feed.callCount, 1);
      assert.equal(feed.args[0][0].since, 22);
      // invoke the change handler
      on.args[0][1]({ id: 'abc', seq: 55 });
    });
  });

  it('attach handles existing meta data doc', done => {
    const get = sinon
      .stub(db.sentinel, 'get')
      .resolves({ _id: '_local/sentinel-meta-data', processed_seq: 22 });

    const insert = sinon.stub(db.sentinel, 'put').resolves({});

    sinon.stub(db.medic, 'get').rejects({ status: 404 });

    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(db.medic, 'changes').returns({ on: on });
    const processChange = sinon.stub(transitions._transitionsLib, 'processChange').callsArg(1);
    // wait for the queue processor
    transitions._changeQueue.drain = () => {
      assert.equal(get.callCount, 2);
      assert.equal(processChange.callCount, 1);
      assert.equal(processChange.args[0][0].id, 'abc');
      assert.equal(processChange.args[0][0].seq, 55);
      assert.equal(insert.callCount, 1);
      assert.equal(insert.args[0][0]._id, '_local/sentinel-meta-data');
      assert.equal(insert.args[0][0].processed_seq, 55);
      done();
    };
    transitions._attach().then(() => {
      assert.equal(feed.callCount, 1);
      assert.equal(feed.args[0][0].since, 22);
      // invoke the change handler
      on.args[0][1]({ id: 'abc', seq: 55 });
    });
  });

  it('processes deleted changes through TombstoneUtils to create tombstones', done => {
    sinon.stub(tombstoneUtils, 'processChange').resolves();
    sinon.stub(metadata, 'update').resolves();
    sinon.stub(db.sentinel, 'put').resolves({});
    sinon
      .stub(db.sentinel, 'get')
      .resolves({ _id: '_local/sentinel-meta-data', processed_seq: 12 });
    sinon.stub(infodoc, 'delete').resolves();

    sinon.stub(db, 'allDbs').resolves([]);

    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(db.medic, 'changes').returns({ on: on });
    transitions._attach().then(() => {
      assert.equal(feed.callCount, 1);
      assert.equal(feed.args[0][0].since, 12);
      assert.equal(on.callCount, 1);
      assert.equal(on.args[0][0], 'change');
      // invoke the change handler
      on.args[0][1]({ id: 'somechange', seq: 55, deleted: true });
    });

    transitions._changeQueue.drain = () => {
      return Promise.resolve().then(() => {
        assert.equal(tombstoneUtils.processChange.callCount, 1);
        assert.deepEqual(tombstoneUtils.processChange.args[0][2], {
          id: 'somechange',
          seq: 55,
          deleted: true,
        });
        return Promise.resolve().then(() => {
          assert.equal(metadata.update.callCount, 1);
          assert.equal(metadata.update.args[0][0], 55);
          done();
        });
      });
    };
  });

  it('does not advance metadata document if creating tombstone fails', done => {
    sinon.stub(tombstoneUtils, 'processChange').rejects();
    sinon.stub(metadata, 'update').resolves();
    sinon.stub(db.sentinel, 'put').resolves({});
    sinon
      .stub(db.sentinel, 'get')
      .resolves({ _id: '_local/sentinel-meta-data', processed_seq: 12 });
    sinon.stub(infodoc, 'delete').resolves();

    sinon.stub(db, 'allDbs').resolves([]);

    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(db.medic, 'changes').returns({ on: on });
    transitions._attach().then(() => {
      assert.equal(feed.callCount, 1);
      assert.equal(feed.args[0][0].since, 12);
      assert.equal(on.callCount, 1);
      assert.equal(on.args[0][0], 'change');
      // invoke the change handler
      on.args[0][1]({ id: 'somechange', seq: 55, deleted: true });
    });

    transitions._changeQueue.drain = () => {
      return Promise.resolve().then(() => {
        assert.equal(tombstoneUtils.processChange.callCount, 1);
        assert.deepEqual(tombstoneUtils.processChange.args[0][2], {
          id: 'somechange',
          seq: 55,
          deleted: true,
        });
        return Promise.resolve().then(() => {
          assert.equal(metadata.update.callCount, 0);
          done();
        });
      });
    };
  });

  it('deleteInfo doc handles missing info doc', () => {
    const given = { id: 'abc' };
    sinon.stub(db.sentinel, 'get').rejects({ status: 404 });
    return infodoc.delete(given);
  });

  it('deleteInfoDoc deletes info doc', () => {
    const given = { id: 'abc' };
    const get = sinon
      .stub(db.sentinel, 'get')
      .resolves({ _id: 'abc', _rev: '123' });
    const insert = sinon.stub(db.sentinel, 'put').resolves({});
    return infodoc.delete(given).then(() => {
      assert.equal(get.callCount, 1);
      assert.equal(get.args[0][0], 'abc-info');
      assert.equal(insert.callCount, 1);
      assert.equal(insert.args[0][0]._deleted, true);
    });
  });

  it('deleteReadDocs handles missing read doc', () => {
    const given = { id: 'abc' };
    const metaDb = {
      remove: sinon.stub(),
      allDocs: sinon.stub().resolves({
        rows: [
          { key: 'read:message:abc', error: 'notfound' },
          { key: 'read:report:abc', error: 'notfound' }
        ]
      }),
    };
    sinon.stub(db, 'allDbs').resolves(['medic-user-gareth-meta']);
    sinon.stub(db, 'get').returns(metaDb);
    return transitions
      ._deleteReadDocs(given)
      .then(() => {
        assert.equal(db.allDbs.callCount, 1);
        assert.equal(db.get.callCount, 1);
        assert.deepEqual(db.get.args[0], ['medic-user-gareth-meta']);
        assert.equal(metaDb.allDocs.callCount, 1);
        assert.deepEqual(metaDb.allDocs.args[0], [{ keys: ['read:report:abc', 'read:message:abc'] }]);
        assert.equal(metaDb.remove.callCount, 0);
      });
  });

  it('deleteReadDocs deletes read doc for all users', () => {
    const given = { id: 'abc' };
    const metaDb = {
      allDocs: sinon.stub().resolves({
        rows: [
          { key: 'read:message:abc', error: 'notfound' },
          { key: 'read:report:abc', id: 'read:report:abc', value: { rev: '1-rev' } }
        ]
      }),
      remove: sinon.stub().resolves()
    };
    const list = sinon.stub(db, 'allDbs').resolves([
      'medic-user-gareth-meta',
      'medic-user-jim-meta',
      'medic', // not a user db - must be ignored
    ]);
    const use = sinon.stub(db, 'get').returns(metaDb);
    return transitions._deleteReadDocs(given).then(() => {
      assert.equal(list.callCount, 1);
      assert.equal(use.callCount, 2);
      assert.equal(use.args[0][0], 'medic-user-gareth-meta');
      assert.equal(use.args[1][0], 'medic-user-jim-meta');
      assert.equal(metaDb.allDocs.callCount, 2);
      assert.equal(metaDb.allDocs.args[0][0].keys.length, 2);
      assert.equal(metaDb.allDocs.args[0][0].keys[0], 'read:report:abc');
      assert.equal(metaDb.allDocs.args[0][0].keys[1], 'read:message:abc');
      assert.equal(metaDb.allDocs.args[1][0].keys.length, 2);
      assert.equal(metaDb.allDocs.args[1][0].keys[0], 'read:report:abc');
      assert.equal(metaDb.allDocs.args[1][0].keys[1], 'read:message:abc');
      assert.equal(metaDb.remove.callCount, 2);
      assert.deepEqual(metaDb.remove.args[0], ['read:report:abc', '1-rev']);
      assert.deepEqual(metaDb.remove.args[1], ['read:report:abc', '1-rev']);
    });
  });

  it('runs transitions lib over changes', done => {
    sinon.stub(metadata, 'update').resolves();
    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(db.medic, 'changes').returns({ on: on });

    sinon.stub(transitions._transitionsLib, 'processChange').callsArgWith(1);
    sinon
      .stub(db.sentinel, 'get')
      .resolves({ _id: '_local/sentinel-meta-data', processed_seq: 12 });

    transitions._attach().then(() => {
      assert.equal(feed.callCount, 1);
      assert.equal(feed.args[0][0].since, 12);
      assert.equal(on.callCount, 1);
      assert.equal(on.args[0][0], 'change');
      // invoke the change handler
      on.args[0][1]({ id: 'somechange', seq: 55 });
    });

    transitions._changeQueue.drain = () => {
      return Promise.resolve().then(() => {
        assert.equal(transitions._transitionsLib.processChange.callCount, 1);
        assert.deepEqual(transitions._transitionsLib.processChange.args[0][0], { id: 'somechange', seq: 55 });
        return Promise.resolve().then(() => {
          assert.equal(metadata.update.callCount, 1);
          assert.equal(metadata.update.args[0][0], 55);
          done();
        });
      });
    };
  });
});
