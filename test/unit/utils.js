var utils = require('../../lib/utils');

exports['updateable returns true when _rev the same'] = function(test) {
    test.ok(utils.updateable({ _rev: '1' }, { _rev: '1', x: 1 }));
    test.done();
}

exports['updateable returns false when _rev different'] = function(test) {
    test.equals(utils.updateable({ _rev: '1' }, { _rev: '2', x: 1 }), false);
    test.equals(utils.updateable({ _rev: '2' }, { _rev: '1', x: 1 }), false);
    test.done();
}

exports['updateable returns false when objects the same'] = function(test) {
    test.equals(utils.updateable({ _rev: '1', x: 1 }, { _rev: '1', x: 1 }), false);
    test.done();
}

