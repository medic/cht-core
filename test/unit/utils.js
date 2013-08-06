var _ = require('underscore'),
    utils = require('../../lib/utils');

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
    test.equals(utils.getClinicContactName({
        related_entities: {
            clinic: { }
        }
    }), 'health volunteer');
    test.done();
}

exports['getClinicContactName gets name if contact'] = function(test) {
    test.equals(utils.getClinicContactName({
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

exports['getClinicPhone gets phone'] = function(test) {
    test.equal(utils.getClinicPhone({
        related_entities: {
            clinic: {
                contact: {
                    phone: '123'
                }
            }
        }
    }), '123');
    test.done();
}

exports['getClinicPhone gets phone if contact'] = function(test) {
    test.equal(utils.getClinicPhone({
        contact: {
            phone: '123'
        }
    }), '123');
    test.done();
}

exports['addMessage adds uuid'] = function(test) {
    var doc = {},
        message,
        task;

    utils.addMessage(doc, {
        phone: '+1234',
        message: 'xxx'
    });

    test.ok(doc.tasks);
    task = _.first(doc.tasks);

    test.ok(_.isArray(task.messages));
    message = _.first(task.messages);
    test.equals(task.state, 'pending');

    test.equals(message.to, '+1234');
    test.equals(message.message, 'xxx');
    test.ok(message.uuid);
    test.done();
}
