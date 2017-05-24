const sinon = require('sinon').sandbox.create(),
      follow = require('follow'),
      audit = require('couchdb-audit'),
      config = require('../../config'),
      db = require('../../db'),
      lineage = require('../../lib/lineage'),
      transitions = require('../../transitions');

exports.tearDown = callback => {
  sinon.restore();
  transitions._changeQueue.kill();
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

exports['loadTransitions loads configured transitions'] = test => {
  // A list of states to test, first arg is the `transitions` config value and
  // second is whether you expect loadTransition to get called.
  const tests = [
    // empty configuration
    [{}, false],
    [undefined, false],
    [null, false],
    // falsey configuration
    [{registration: null}, false],
    [{registration: undefined}, false],
    [{registration: false}, false],
    // transition not available
    [{foo: true}, false],
    // available and enabled
    [{registration: {}}, true],
    [{registration: true}, true],
    [{registration: 'x'}, true],
    [{
      registration: {
        param: 'val'
      }
    }, true],
    // support old style
    [{
      registration: {
        load: '../etc/passwd'
      }
    }, true],
    // support old style disable property
    [{
      registration: {
        disable: true
      }
    }, false],
    [{
      registration: {
        disable: false
      }
    }, true]
  ];
  test.expect(tests.length);
  tests.forEach(t => {
    sinon.stub(config, 'get').returns(t[0]);
    const stub = sinon.stub(transitions, '_loadTransition');
    transitions.loadTransitions(false);
    test.equal(stub.called, t[1]);
    stub.restore();
    config.get.restore();
  });
  test.done();
};

exports['loadTransitions loads system transitions by default'] = test => {
  sinon.stub(config, 'get').returns({});
  const stub = sinon.stub(transitions, '_loadTransition');
  transitions.loadTransitions();
  test.equal(stub.calledWith('maintain_info_document'), true);
  stub.restore();
  config.get.restore();
  test.done();
};

exports['loadTransitions doesnt load system transistions that have been explicitly disabled'] = test => {
  sinon.stub(config, 'get').returns({maintain_info_document: {disable: true}});
  const stub = sinon.stub(transitions, '_loadTransition');
  transitions.loadTransitions();
  test.equal(stub.calledWith('maintain_info_document'), false);
  stub.restore();
  config.get.restore();
  test.done();
};

exports['attach handles missing meta data doc'] = test => {
  const get = sinon.stub(db.medic, 'get');
  get.withArgs('sentinel-meta-data').callsArgWith(1, { statusCode: 404 });
  const fetchHydratedDoc = sinon.stub(lineage, 'fetchHydratedDoc').callsArgWith(1, null, { type: 'data_record' });
  const insert = sinon.stub(db.medic, 'insert').callsArg(1);
  const on = sinon.stub();
  const start = sinon.stub();
  const feed = sinon.stub(follow, 'Feed').returns({ on: on, follow: start });
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
    test.equal(insert.args[0][0]._id, 'sentinel-meta-data');
    test.equal(insert.args[0][0].processed_seq, 55);
    test.done();
  };
  transitions.attach();
  test.equal(feed.callCount, 1);
  test.equal(feed.args[0][0].since, 0);
  test.equal(on.callCount, 1);
  test.equal(on.args[0][0], 'change');
  test.equal(start.callCount, 1);
  // invoke the change handler
  on.args[0][1]({ id: 'abc', seq: 55 });
};

exports['attach handles existing meta data doc'] = test => {
  const get = sinon.stub(db.medic, 'get');
  get.withArgs('sentinel-meta-data').callsArgWith(1, null, { _id: 'sentinel-meta-data', processed_seq: 22 });
  const fetchHydratedDoc = sinon.stub(lineage, 'fetchHydratedDoc').callsArgWith(1, null, { type: 'data_record' });
  const insert = sinon.stub(db.medic, 'insert').callsArg(1);
  const on = sinon.stub();
  const start = sinon.stub();
  const feed = sinon.stub(follow, 'Feed').returns({ on: on, follow: start });
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
    test.equal(insert.args[0][0]._id, 'sentinel-meta-data');
    test.equal(insert.args[0][0].processed_seq, 55);
    test.done();
  };
  transitions.attach();
  test.equal(feed.callCount, 1);
  test.equal(feed.args[0][0].since, 22);
  test.equal(on.callCount, 1);
  test.equal(on.args[0][0], 'change');
  test.equal(start.callCount, 1);
  // invoke the change handler
  on.args[0][1]({ id: 'abc', seq: 55 });
};
