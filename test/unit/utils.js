process.env.TEST_ENV = 'hello'; // required for ../../db.js

var _ = require('underscore'),
    db = require('../../db'),
    sinon = require('sinon'),
    utils = require('../../lib/utils');

exports.tearDown = function(callback) {
    if (db.view.restore) {
        db.view.restore();      
    }
    callback();
}

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

exports['getRecentForm calls through to db view correctly'] = function(test) {
    
    var formName = 'someForm';
    var clinicId = 'someClinicId';
    var result = [{_id: 'someRowId'}];

    sinon.stub(db, 'view')
        .withArgs(
            'kujua-sentinel', 
            'data_records_by_form_and_clinic', 
            {
                startkey: [formName, clinicId],
                endkey: [formName, clinicId],
                include_docs: true
            }
        )
        .callsArgWith(3, null, { rows: result });

    test.expect(2);
    utils.getRecentForm({
        formName: formName, 
        doc: {
            related_entities: {
                clinic: {
                    _id: clinicId
                }
            }
        }
    }, function(err, data) {
        test.equals(err, null);
        test.equals(data, result);
        test.done();
    });
}   