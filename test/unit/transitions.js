var _ = require('underscore'),
    sinon = require('sinon'),
    config = require('../../config'),
    transitions = require('../../transitions');

exports.tearDown = function(callback) {
  if (config.get.restore) {
    config.get.restore();
  }
  callback();
};

exports['has canRun fn'] = function(test) {
    test.equals(_.isFunction(transitions.canRun), true);
    test.done();
};

exports['canRun returns false if filter returns false'] = function(test) {
    test.equals(transitions.canRun({
        change: {
            doc: {}
        },
        transition: {
            filter: function() { return false; }
        }
    }), false);
    test.done();
};

exports['canRun returns true if filter returns true'] = function(test) {
    test.equals(transitions.canRun({
        change: {
            doc: {}
        },
        transition: {
            filter: function() { return true; }
        }
    }), true);
    test.done();
};

exports['canRun returns false if change is deletion'] = function(test) {
    test.equals(transitions.canRun({
        change: {
            doc: {},
            deleted: true
        },
        transition: {
            filter: function() { return true; }
        }
    }), false);
    test.done();
};

exports['canRun returns false if rev is same'] = function(test) {
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
            filter: function() { return true; }
        }
    }), false);
    test.done();
};

exports['canRun returns true if rev is different'] = function(test) {
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
            filter: function() { return true; }
        }
    }), true);
    test.done();
};

exports['canRun returns false for v2.x xml forms'] = function(test) {
    test.equals(transitions.canRun({
        key: 'x',
        change: {
            doc: {
                _rev: '1',

                transitions: {
                    x: {
                        last_rev: '2'
                    }
                },
                type: 'data_record',
                content_type: 'xml'
            }
        },
        transition: {
            filter: function() { return true; }
        }
    }), false);
    test.done();
};

exports['canRun returns true if transition is not defined'] = function(test) {
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
            filter: function() { return true; }
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
            filter: function() { return true; }
        }
    }), true);
    test.done();
};


exports['describe loadTransitions'] = function(test) {
  // A list of states to test, first arg is the `transitions` config value and
  // second is whether you expect loadTransition to get called.
  var tests = [
    // empty configuration
    [{}, false],
    [undefined, false],
    [null, false],
    // falsey configuration
    [{registration: null}, false],
    [{registration: undefined}, false],
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
  tests.forEach(function(t) {
    sinon.stub(config, 'get').returns(t[0]);
    var stub = sinon.stub(transitions, '_loadTransition');
    transitions._loadTransitions();
    test.equal(stub.called, t[1]);
    stub.restore();
    config.get.restore();
  });
  test.done();
};
