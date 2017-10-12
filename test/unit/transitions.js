const sinon = require('sinon').sandbox.create(),
      follow = require('follow'),
      audit = require('couchdb-audit'),
      _ = require('underscore'),
      config = require('../../config'),
      db = require('../../db'),
      lineage = require('../../lib/lineage'),
      transitions = require('../../transitions');

exports.tearDown = callback => {
  transitions._changeQueue.kill();
  transitions._detach();
  sinon.restore();
  callback();
};

exports['canRun returns false if filter returns false'] = test => {
  test.equals(transitions.canRun({
    change: {
      doc: {}
    },
    transition: {
      filter: () => false
    }
  }), false);
  test.done();
};

exports['canRun returns true if filter returns true'] = test => {
  test.equals(transitions.canRun({
    change: {
      doc: {}
    },
    transition: {
      filter: () => true
    }
  }), true);
  test.done();
};

exports['canRun returns false if change is deletion'] = test => {
  test.equals(transitions.canRun({
    change: {
      doc: {},
      deleted: true
    },
    transition: {
      filter: () => true
    }
  }), false);
  test.done();
};

exports['canRun returns false if rev is same'] = test => {
  test.equals(transitions.canRun({
    key: 'x',
    change: {
      doc: {
        _rev: '1',
        transitions: {
          x: {
            last_rev: '1'
          }
        }
      }
    },
    transition: {
      filter: () => true
    }
  }), false);
  test.done();
};

exports['canRun returns true if rev is different'] = test => {
  test.equals(transitions.canRun({
    key: 'x',
    change: {
      doc: {
        _rev: '1',
        transitions: {
          x: {
            last_rev: '2'
          }
        }
      }
    },
    transition: {
      filter: () => true
    }
  }), true);
  test.done();
};

exports['canRun returns true if transition is not defined'] = test => {
  test.expect(2);
  test.equals(transitions.canRun({
    key: 'foo',
    change: {
      doc: {
        _rev: '1',
        transitions: {
          baz: {
            last_rev: '2'
          }
        }
      }
    },
    transition: {
      filter: () => true
    }
  }), true);
  test.equals(transitions.canRun({
    key: 'foo',
    change: {
      doc: {
        _rev: '1',
        transitions: {}
      }
    },
    transition: {
      filter: () => true
    }
  }), true);
  test.done();
};

// A list of states to test, first arg is the `transitions` config value and
// second is whether you expect loadTransition to get called.
const loadTests = [
  // empty configuration
  { name: 'empty', given: {}, expectedCalls: { load: false, attach: true } },
  { name: 'undefined', given: undefined, expectedCalls: { load: false, attach: true } },
  { name: 'null', given: null, expectedCalls: { load: false, attach: true } },

  // falsey configuration
  { name: 'transition null', given: { registration: null }, expectedCalls: { load: false, attach: true } },
  { name: 'transition undefined', given: { registration: undefined }, expectedCalls: { load: false, attach: true } },
  { name: 'transition false', given: { registration: false }, expectedCalls: { load: false, attach: true } },

  // invalid configurations
  { name: 'unknown name', given: { foo: true }, expectedCalls: { load: false, attach: false } },

  // available and enabled
  { name: 'transition empty', given: { registration: {} }, expectedCalls: { load: true, attach: true } },
  { name: 'transition true', given: { registration: true }, expectedCalls: { load: true, attach: true } },
  { name: 'transition string', given: { registration: 'x' }, expectedCalls: { load: true, attach: true } },
  { name: 'transition object', given: { registration: { param: 'val' } }, expectedCalls: { load: true, attach: true } },

  // support old style
  { name: 'old style', given: { registration: { load: '../etc/passwd' } }, expectedCalls: { load: true, attach: true } },
  { name: 'old style true', given: { registration: { disable: true } }, expectedCalls: { load: false, attach: true } },
  { name: 'old style false', given: { registration: { disable: false } }, expectedCalls: { load: true, attach: true } }
];
loadTests.forEach(loadTest => {
  exports[`loadTransitions loads configured transitions: ${loadTest.name}`] = test => {
    sinon.stub(config, 'get').returns(loadTest.given);
    const load = sinon.stub(transitions, '_loadTransition');
    const attach = sinon.stub(transitions, '_attach');
    const detach = sinon.stub(transitions, '_detach');
    transitions.loadTransitions(false);
    test.equal(load.callCount, loadTest.expectedCalls.load ? 1 : 0);
    test.equal(attach.callCount, loadTest.expectedCalls.attach ? 1 : 0);
    test.equal(detach.callCount, loadTest.expectedCalls.attach ? 0 : 1);
    test.done();
  };
});

exports['loadTransitions load throws detach is called'] = test => {
  sinon.stub(config, 'get').returns({ registration: true });
  const load = sinon.stub(transitions, '_loadTransition').throws(new Error('some config error'));
  const attach = sinon.stub(transitions, '_attach');
  const detach = sinon.stub(transitions, '_detach');
  transitions.loadTransitions(false);
  test.equal(load.callCount, 1);
  test.equal(attach.callCount, 0);
  test.equal(detach.callCount, 1);
  test.done();
};

exports['loadTransitions loads system transitions by default'] = test => {
  sinon.stub(config, 'get').returns({});
  const stub = sinon.stub(transitions, '_loadTransition');
  transitions.loadTransitions();
  test.equal(stub.calledWith('maintain_info_document'), true);
  test.done();
};

exports['loadTransitions does not load system transistions that have been explicitly disabled'] = test => {
  sinon.stub(config, 'get').returns({maintain_info_document: {disable: true}});
  const stub = sinon.stub(transitions, '_loadTransition');
  transitions.loadTransitions();
  test.equal(stub.calledWith('maintain_info_document'), false);
  test.done();
};

exports['attach handles missing meta data doc'] = test => {
  const get = sinon.stub(db.medic, 'get');
  get.withArgs('_local/sentinel-meta-data').callsArgWith(1, { statusCode: 404 });
  const fetchHydratedDoc = sinon.stub(lineage, 'fetchHydratedDoc').returns(Promise.resolve({ type: 'data_record' }));
  const insert = sinon.stub(db.medic, 'insert').callsArg(1);
  const on = sinon.stub();
  const start = sinon.stub();
  const feed = sinon.stub(follow, 'Feed').returns({ on: on, follow: start, stop: () => {} });
  const applyTransitions = sinon.stub(transitions, 'applyTransitions').callsArg(1);
  sinon.stub(audit, 'withNano');
  // wait for the queue processor
  transitions._changeQueue.drain = () => {
    test.equal(get.callCount, 2);
    test.equal(fetchHydratedDoc.callCount, 1);
    test.equal(fetchHydratedDoc.args[0][0], 'abc');
    test.equal(applyTransitions.callCount, 1);
    test.equal(applyTransitions.args[0][0].change.id, 'abc');
    test.equal(applyTransitions.args[0][0].change.seq, 55);
    test.equal(insert.callCount, 1);
    test.equal(insert.args[0][0]._id, '_local/sentinel-meta-data');
    test.equal(insert.args[0][0].processed_seq, 55);
    test.done();
  };
  transitions._attach();
  test.equal(feed.callCount, 1);
  test.equal(feed.args[0][0].since, 0);
  test.equal(on.callCount, 2);
  test.equal(on.args[0][0], 'change');
  test.equal(on.args[1][0], 'error');
  test.equal(start.callCount, 1);
  // invoke the change handler
  on.args[0][1]({ id: 'abc', seq: 55 });
};

exports['attach handles existing meta data doc'] = test => {
  const get = sinon.stub(db.medic, 'get');
  get.withArgs('_local/sentinel-meta-data').callsArgWith(1, null, { _id: '_local/sentinel-meta-data', processed_seq: 22 });
  const fetchHydratedDoc = sinon.stub(lineage, 'fetchHydratedDoc').returns(Promise.resolve({ type: 'data_record' }));
  const insert = sinon.stub(db.medic, 'insert').callsArg(1);
  const on = sinon.stub();
  const start = sinon.stub();
  const feed = sinon.stub(follow, 'Feed').returns({ on: on, follow: start, stop: () => {} });
  const applyTransitions = sinon.stub(transitions, 'applyTransitions').callsArg(1);
  sinon.stub(audit, 'withNano');
  // wait for the queue processor
  transitions._changeQueue.drain = () => {
    test.equal(get.callCount, 2);
    test.equal(fetchHydratedDoc.callCount, 1);
    test.equal(fetchHydratedDoc.args[0][0], 'abc');
    test.equal(applyTransitions.callCount, 1);
    test.equal(applyTransitions.args[0][0].change.id, 'abc');
    test.equal(applyTransitions.args[0][0].change.seq, 55);
    test.equal(insert.callCount, 1);
    test.equal(insert.args[0][0]._id, '_local/sentinel-meta-data');
    test.equal(insert.args[0][0].processed_seq, 55);
    test.done();
  };
  transitions._attach();
  test.equal(feed.callCount, 1);
  test.equal(feed.args[0][0].since, 22);
  test.equal(on.callCount, 2);
  test.equal(on.args[0][0], 'change');
  test.equal(on.args[1][0], 'error');
  test.equal(start.callCount, 1);
  // invoke the change handler
  on.args[0][1]({ id: 'abc', seq: 55 });
};

const requiredFunctions = {
  onMatch: 4,
  filter: 1
};

transitions.availableTransitions().forEach(name => {
  const transition = require(`../../transitions/${name}`);
  Object.keys(requiredFunctions).forEach(key => {
    exports[`Checking ${key} signature for ${name} transition`] = test => {
      test.ok(_.isFunction(transition[key]), 'Required function not found');
      test.equal(transition[key].length, requiredFunctions[key], 'Function takes the wrong number of parameters');
      test.done();
    };
  });
});

exports['deleteInfo doc handles missing info doc'] = test => {
  const given = { id: 'abc' };
  sinon.stub(db.medic, 'get').callsArgWith(1, { statusCode: 404 });
  transitions._deleteInfoDoc(given, err => {
    test.equal(err, undefined);
    test.done();
  });
};

exports['deleteInfoDoc deletes info doc'] = test => {
  const given = { id: 'abc' };
  const get = sinon.stub(db.medic, 'get').callsArgWith(1, null, { _id: 'abc', _rev: '123' });
  const insert = sinon.stub(db.medic, 'insert').callsArg(1);
  transitions._deleteInfoDoc(given, err => {
    test.equal(err, undefined);
    test.equal(get.callCount, 1);
    test.equal(get.args[0][0], 'abc-info');
    test.equal(insert.callCount, 1);
    test.equal(insert.args[0][0]._deleted, true);
    test.done();
  });
};

exports['deleteReadDocs handles missing meta db'] = test => {
  const given = { id: 'abc' };
  const metaDb = { info: function() {} };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [ { id: 'org.couchdb.user:gareth' } ]
  });
  sinon.stub(db, 'use').returns(metaDb);
  sinon.stub(metaDb, 'info').callsArgWith(0, { statusCode: 404 });
  transitions._deleteReadDocs(given, err => {
    test.equal(err, undefined);
    test.done();
  });
};

exports['deleteReadDocs handles missing read doc'] = test => {
  const given = { id: 'abc' };
  const metaDb = {
    info: function() {},
    fetch: function() {}
  };
  sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { id: 'org.couchdb.user:gareth' }
  ] });
  sinon.stub(db, 'use').returns(metaDb);
  sinon.stub(metaDb, 'info').callsArg(0);
  sinon.stub(metaDb, 'fetch').callsArgWith(1, null, { rows: [ { error: 'notfound' } ] });
  transitions._deleteReadDocs(given, err => {
    test.equal(err, undefined);
    test.done();
  });
};

exports['deleteReadDocs deletes read doc for all admins'] = test => {
  const given = { id: 'abc' };
  const metaDb = {
    info: function() {},
    fetch: function() {},
    insert: function() {}
  };
  const view = sinon.stub(db.medic, 'view').callsArgWith(3, null, { rows: [
    { id: 'org.couchdb.user:gareth' },
    { id: 'org.couchdb.user:jim' }
  ] });
  const use = sinon.stub(db, 'use').returns(metaDb);
  const info = sinon.stub(metaDb, 'info').callsArg(0);
  const fetch = sinon.stub(metaDb, 'fetch').callsArgWith(1, null, { rows: [
    { error: 'notfound' },
    { doc: { id: 'xyz' } }
  ] });
  const insert = sinon.stub(metaDb, 'insert').callsArg(1);
  transitions._deleteReadDocs(given, err => {
    test.equal(err, undefined);
    test.equal(view.callCount, 1);
    test.equal(use.callCount, 2);
    test.equal(use.args[0][0], 'medic-user-gareth-meta');
    test.equal(use.args[1][0], 'medic-user-jim-meta');
    test.equal(info.callCount, 2);
    test.equal(fetch.callCount, 2);
    test.equal(fetch.args[0][0].keys.length, 2);
    test.equal(fetch.args[0][0].keys[0], 'read:report:abc');
    test.equal(fetch.args[0][0].keys[1], 'read:message:abc');
    test.equal(fetch.args[1][0].keys.length, 2);
    test.equal(fetch.args[1][0].keys[0], 'read:report:abc');
    test.equal(fetch.args[1][0].keys[1], 'read:message:abc');
    test.equal(insert.callCount, 2);
    test.equal(insert.args[0][0]._deleted, true);
    test.equal(insert.args[1][0]._deleted, true);
    test.done();
  });
};
