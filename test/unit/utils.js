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

exports['getClinicContactName gets name'] = function(test) {
    test.equal(utils.getClinicContactName({
        related_entities: {
            clinic: {
                contact: {
                    name: 'Y'
                }
            }
        }
    }), 'Y');
    test.done();
}

exports['getClinicContactName gets returns health volunteer if miss'] = function(test) {
    test.equal(utils.getClinicContactName({
        related_entities: {
            clinic: { }
        }
    }), 'health volunteer');
    test.done();
}

exports['getClinicContactName gets name if contact'] = function(test) {
    test.equal(utils.getClinicContactName({
        contact: {
            name: 'Y'
        }
    }), 'Y');
    test.done();
}

exports['getClinicName gets returns health volunteer if miss'] = function(test) {
    test.equal(utils.getClinicName({
        related_entities: {
            clinic: { }
        }
    }), 'health volunteer');
    test.done();
}

exports['getClinicName gets name if contact'] = function(test) {
    test.equal(utils.getClinicName({
        name: 'Y'
    }), 'Y');
    test.done();
}

exports['getClinicName gets name'] = function(test) {
    test.equal(utils.getClinicName({
        related_entities: {
            clinic: {
                name: 'Y'
            }
        }
    }), 'Y');
    test.done();
}
