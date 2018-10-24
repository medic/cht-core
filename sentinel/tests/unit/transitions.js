const sinon = require('sinon'),
  assert = require('chai').assert,
  _ = require('underscore'),
  config = require('../../src/config'),
  db = require('../../src/db-nano'),
  dbPouch = require('../../src/db-pouch'),
  infodoc = require('../../src/lib/infodoc'),
  transitions = require('../../src/transitions'),
  metadata = require('../../src/lib/metadata'),
  tombstoneUtils = require('@shared-libs/tombstone-utils');

describe('transitions', () => {
  afterEach(() => {
    transitions._changeQueue.kill();
    transitions._detach();
    sinon.restore();
  });

  it('canRun returns false if filter returns false', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
        },
        transition: {
          filter: () => false,
        },
      }),
      false
    );
  });

  it('canRun returns true if filter returns true', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });

  it('canRun returns false if change is deletion', () => {
    assert.equal(
      transitions.canRun({
        change: {
          doc: {},
          info: {},
          deleted: true,
        },
        transition: {
          filter: () => true,
        },
      }),
      false
    );
  });

  it('canRun returns false if rev is same', () => {
    assert.equal(
      transitions.canRun({
        key: 'x',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              x: {
                last_rev: '1',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      false
    );
  });

  it('canRun returns true if rev is different', () => {
    assert.equal(
      transitions.canRun({
        key: 'x',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              x: {
                last_rev: '2',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });

  it('canRun returns true if transition is not defined', () => {
    assert.equal(
      transitions.canRun({
        key: 'foo',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {
              baz: {
                last_rev: '2',
              },
            },
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
    assert.equal(
      transitions.canRun({
        key: 'foo',
        change: {
          doc: {
            _rev: '1',
          },
          info: {
            transitions: {},
          },
        },
        transition: {
          filter: () => true,
        },
      }),
      true
    );
  });

  // A list of states to test, first arg is the `transitions` config value and
  // second is whether you expect loadTransition to get called.
  const loadTests = [
    // empty configuration
    { name: 'empty', given: {}, expectedCalls: { load: false, attach: true } },
    {
      name: 'undefined',
      given: undefined,
      expectedCalls: { load: false, attach: true },
    },
    { name: 'null', given: null, expectedCalls: { load: false, attach: true } },

    // falsey configuration
    {
      name: 'transition null',
      given: { registration: null },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'transition undefined',
      given: { registration: undefined },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'transition false',
      given: { registration: false },
      expectedCalls: { load: false, attach: true },
    },

    // invalid configurations
    {
      name: 'unknown name',
      given: { foo: true },
      expectedCalls: { load: false, attach: false },
    },

    // available and enabled
    {
      name: 'transition empty',
      given: { registration: {} },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition true',
      given: { registration: true },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition string',
      given: { registration: 'x' },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'transition object',
      given: { registration: { param: 'val' } },
      expectedCalls: { load: true, attach: true },
    },

    // support old style
    {
      name: 'old style',
      given: { registration: { load: '../etc/passwd' } },
      expectedCalls: { load: true, attach: true },
    },
    {
      name: 'old style true',
      given: { registration: { disable: true } },
      expectedCalls: { load: false, attach: true },
    },
    {
      name: 'old style false',
      given: { registration: { disable: false } },
      expectedCalls: { load: true, attach: true },
    },
  ];
  loadTests.forEach(loadTest => {
    it(`loadTransitions loads configured transitions: ${loadTest.name}`, () => {
      sinon.stub(config, 'get').returns(loadTest.given);
      const load = sinon.stub(transitions, '_loadTransition');
      const attach = sinon.stub(transitions, '_attach');
      const detach = sinon.stub(transitions, '_detach');
      transitions.loadTransitions();
      assert.equal(load.callCount, loadTest.expectedCalls.load ? 1 : 0);
      assert.equal(attach.callCount, loadTest.expectedCalls.attach ? 1 : 0);
      assert.equal(detach.callCount, loadTest.expectedCalls.attach ? 0 : 1);
    });
  });

  it('loadTransitions load throws detach is called', () => {
    sinon.stub(config, 'get').returns({ registration: true });
    const load = sinon
      .stub(transitions, '_loadTransition')
      .throws(new Error('some config error'));
    const attach = sinon.stub(transitions, '_attach');
    const detach = sinon.stub(transitions, '_detach');
    transitions.loadTransitions();
    assert.equal(load.callCount, 1);
    assert.equal(attach.callCount, 0);
    assert.equal(detach.callCount, 1);
  });

  it('loadTransitions loads system transitions by default', () => {
    sinon.stub(config, 'get').returns({});
    sinon.stub(transitions, '_attach');
    const stub = sinon.stub(transitions, '_loadTransition');
    transitions.loadTransitions();
    assert.equal(stub.callCount, 0);
  });

  it('loadTransitions does not load system transistions that have been explicitly disabled', () => {
    sinon.stub(config, 'get').returns({ death_reporting: { disable: true } });
    sinon.stub(transitions, '_attach');
    const stub = sinon.stub(transitions, '_loadTransition');
    transitions.loadTransitions();
    assert.equal(stub.calledWith('death_reporting'), false);
  });

  it('attach handles missing meta data doc', done => {
    sinon.stub(dbPouch.sentinel, 'get').rejects({ status: 404 });
    sinon.stub(dbPouch.medic, 'get').rejects({ status: 404 });

    const fetchHydratedDoc = sinon
      .stub(transitions._lineage, 'fetchHydratedDoc')
      .resolves({ type: 'data_record' });
    sinon.stub(infodoc, 'get').resolves({});
    const insert = sinon.stub(dbPouch.sentinel, 'put').resolves({});
    sinon.stub(dbPouch.medic, 'put').resolves({});

    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(dbPouch.medic, 'changes').returns({ on: on });

    const applyTransitions = sinon
      .stub(transitions, 'applyTransitions')
      .callsArg(1);
    // wait for the queue processor
    transitions._changeQueue.drain = () => {
      assert.equal(fetchHydratedDoc.callCount, 1);
      assert.equal(fetchHydratedDoc.args[0][0], 'abc');
      assert.equal(applyTransitions.callCount, 1);
      assert.equal(applyTransitions.args[0][0].id, 'abc');
      assert.equal(applyTransitions.args[0][0].seq, 55);
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
    const sentinelGet = sinon.stub(dbPouch.sentinel, 'get');
    sentinelGet.withArgs('_local/sentinel-meta-data').rejects({ status: 404 });

    const medicGet = sinon.stub(dbPouch.medic, 'get');
    medicGet.withArgs('_local/sentinel-meta-data').rejects({ status: 404 });
    medicGet
      .withArgs('sentinel-meta-data')
      .resolves({
        _id: 'sentinel-meta-data',
        _rev: '1-123',
        processed_seq: 22,
      });

    const fetchHydratedDoc = sinon
      .stub(transitions._lineage, 'fetchHydratedDoc')
      .resolves({ type: 'data_record' });
    sinon.stub(infodoc, 'get').resolves({});
    const medicPut = sinon.stub(dbPouch.medic, 'put').resolves({});
    const sentinelPut = sinon.stub(dbPouch.sentinel, 'put').resolves({});
    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(dbPouch.medic, 'changes').returns({ on: on });
    const applyTransitions = sinon
      .stub(transitions, 'applyTransitions')
      .callsArg(1);
    // wait for the queue processor
    transitions._changeQueue.drain = () => {
      assert.equal(sentinelGet.callCount, 2);
      assert.equal(medicGet.callCount, 4);
      assert.equal(fetchHydratedDoc.callCount, 1);
      assert.equal(fetchHydratedDoc.args[0][0], 'abc');
      assert.equal(applyTransitions.callCount, 1);
      assert.equal(applyTransitions.args[0][0].id, 'abc');
      assert.equal(applyTransitions.args[0][0].seq, 55);

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
      .stub(dbPouch.sentinel, 'get')
      .resolves({ _id: '_local/sentinel-meta-data', processed_seq: 22 });
    const fetchHydratedDoc = sinon
      .stub(transitions._lineage, 'fetchHydratedDoc')
      .resolves({ type: 'data_record' });

    const info = sinon.stub(infodoc, 'get').resolves({});
    const insert = sinon.stub(dbPouch.sentinel, 'put').resolves({});

    sinon.stub(dbPouch.medic, 'get').rejects({ status: 404 });

    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(dbPouch.medic, 'changes').returns({ on: on });
    const applyTransitions = sinon
      .stub(transitions, 'applyTransitions')
      .callsArg(1);
    // wait for the queue processor
    transitions._changeQueue.drain = () => {
      assert.equal(get.callCount, 2);
      assert.equal(info.callCount, 1);
      assert.equal(fetchHydratedDoc.callCount, 1);
      assert.equal(fetchHydratedDoc.args[0][0], 'abc');
      assert.equal(applyTransitions.callCount, 1);
      assert.equal(applyTransitions.args[0][0].id, 'abc');
      assert.equal(applyTransitions.args[0][0].seq, 55);
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
    sinon.stub(dbPouch.sentinel, 'put').resolves({});
    sinon
      .stub(dbPouch.sentinel, 'get')
      .resolves({ _id: '_local/sentinel-meta-data', processed_seq: 12 });
    sinon.stub(infodoc, 'delete').resolves();

    sinon.stub(db.db, 'list').callsArgWith(0, null, []);

    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(dbPouch.medic, 'changes').returns({ on: on });
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
    sinon.stub(dbPouch.sentinel, 'put').resolves({});
    sinon
      .stub(dbPouch.sentinel, 'get')
      .resolves({ _id: '_local/sentinel-meta-data', processed_seq: 12 });
    sinon.stub(infodoc, 'delete').resolves();

    sinon.stub(db.db, 'list').callsArgWith(0, null, []);

    const on = sinon.stub().returns({ on: () => ({ cancel: () => null }) });
    const feed = sinon.stub(dbPouch.medic, 'changes').returns({ on: on });
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

  const requiredFunctions = {
    onMatch: 1,
    filter: 1,
  };

  transitions.availableTransitions().forEach(name => {
    const transition = require(`../../src/transitions/${name}`);
    Object.keys(requiredFunctions).forEach(key => {
      it(`Checking ${key} signature for ${name} transition`, () => {
        assert(_.isFunction(transition[key]), 'Required function not found');
        assert.equal(
          transition[key].length,
          requiredFunctions[key],
          'Function takes the wrong number of parameters'
        );
      });
    });
  });

  it('deleteInfo doc handles missing info doc', () => {
    const given = { id: 'abc' };
    sinon.stub(dbPouch.sentinel, 'get').rejects({ status: 404 });
    return infodoc.delete(given);
  });

  it('deleteInfoDoc deletes info doc', () => {
    const given = { id: 'abc' };
    const get = sinon
      .stub(dbPouch.sentinel, 'get')
      .resolves({ _id: 'abc', _rev: '123' });
    const insert = sinon.stub(dbPouch.sentinel, 'put').resolves({});
    return infodoc.delete(given).then(() => {
      assert.equal(get.callCount, 1);
      assert.equal(get.args[0][0], 'abc-info');
      assert.equal(insert.callCount, 1);
      assert.equal(insert.args[0][0]._deleted, true);
    });
  });

  it('deleteReadDocs handles missing read doc', done => {
    const given = { id: 'abc' };
    const metaDb = {
      info: function() {},
      fetch: function() {},
    };
    sinon.stub(db.db, 'list').callsArgWith(0, null, ['medic-user-gareth-meta']);
    sinon.stub(db, 'use').returns(metaDb);
    sinon
      .stub(metaDb, 'fetch')
      .callsArgWith(1, null, { rows: [{ error: 'notfound' }] });
    transitions._deleteReadDocs(given, err => {
      assert.equal(err, undefined);
      done();
    });
  });

  it('deleteReadDocs deletes read doc for all admins', done => {
    const given = { id: 'abc' };
    const metaDb = {
      info: function() {},
      fetch: function() {},
      insert: function() {},
    };
    const list = sinon.stub(db.db, 'list').callsArgWith(0, null, [
      'medic-user-gareth-meta',
      'medic-user-jim-meta',
      'medic', // not a user db - must be ignored
    ]);
    const use = sinon.stub(db, 'use').returns(metaDb);
    const fetch = sinon.stub(metaDb, 'fetch').callsArgWith(1, null, {
      rows: [{ error: 'notfound' }, { doc: { id: 'xyz' } }],
    });
    const insert = sinon.stub(metaDb, 'insert').callsArg(1);
    transitions._deleteReadDocs(given, err => {
      assert.equal(err, undefined);
      assert.equal(list.callCount, 1);
      assert.equal(use.callCount, 2);
      assert.equal(use.args[0][0], 'medic-user-gareth-meta');
      assert.equal(use.args[1][0], 'medic-user-jim-meta');
      assert.equal(fetch.callCount, 2);
      assert.equal(fetch.args[0][0].keys.length, 2);
      assert.equal(fetch.args[0][0].keys[0], 'read:report:abc');
      assert.equal(fetch.args[0][0].keys[1], 'read:message:abc');
      assert.equal(fetch.args[1][0].keys.length, 2);
      assert.equal(fetch.args[1][0].keys[0], 'read:report:abc');
      assert.equal(fetch.args[1][0].keys[1], 'read:message:abc');
      assert.equal(insert.callCount, 2);
      assert.equal(insert.args[0][0]._deleted, true);
      assert.equal(insert.args[1][0]._deleted, true);
      done();
    });
  });
});
