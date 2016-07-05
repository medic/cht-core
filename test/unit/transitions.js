var _ = require('underscore'),
    transitions = require('../../transitions');

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




