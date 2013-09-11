var _ = require('underscore'),
    transitions = require('../../transitions');

exports['has canRun fn'] = function(test) {
    test.equals(_.isFunction(transitions.canRun), true);
    test.equals(transitions.canRun.length, 3);

    test.done();
};

exports['returns true if not run before'] = function(test) {
    test.equals(transitions.canRun({}, 'x', {}), true);
    test.done();
};

exports['returns false if run before'] = function(test) {
    test.equals(transitions.canRun({}, 'x', {
        transitions: {
            x: { ok: true }
        }
    }), false);
    test.done();
};

exports['returns true if repeatable'] = function(test) {
    test.equals(transitions.canRun({
        repeatable: true
    }, 'x', {
        transitions: {
            x: { ok: true }
        }
    }), true);
    test.done();
};

exports['returns false if repeatable and last rev matches'] = function(test) {
    test.equals(transitions.canRun({
        repeatable: true
    }, 'x', {
        _rev: '11-abcd',
        transitions: {
            x: {
                ok: true,
                last_rev: 11
            }
        }
    }), false);
    test.done();
};

exports['returns true if repeatable and last rev does not match'] = function(test) {
    test.equals(transitions.canRun({
        repeatable: true
    }, 'x', {
        _rev: '13-abcd',
        transitions: {
            x: {
                ok: true,
                last_rev: 11
            }
        }
    }), true);
    test.done();
};
