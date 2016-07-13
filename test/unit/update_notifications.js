var _ = require('underscore'),
    sinon = require('sinon'),
    transition = require('../../transitions/update_notifications'),
    utils = require('../../lib/utils');

var restore = function(objs) {
    _.each(objs, function(obj) {
        if (obj.restore) {
            obj.restore();
        }
    });
};

exports.tearDown = function(callback) {
    restore([
        transition.getConfig,
        utils.getRegistrations,
        utils.getClinicPhone
    ]);
    callback();
};

exports['onMatch signature'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.equals(transition.onMatch.length, 4);
    test.done();
};

exports['filter signature'] = function(test) {
    test.ok(_.isFunction(transition.filter));
    test.equals(transition.filter.length, 1);
    test.done();
};

exports['filter empty doc does not match'] = function(test) {
    test.ok(!transition.filter({}));
    test.done();
};

exports['filter missing form does not match'] = function(test) {
    test.ok(!transition.filter({
        patient_id: 'x',
    }));
    test.done();
};

exports['filter missing clinic phone does not match'] = function(test) {
    sinon.stub(utils, 'getClinicPhone').returns(null);
    test.ok(!transition.filter({
        form: 'x',
        patient_id: 'x'
    }));
    test.done();
};

exports['filter already run does not match'] = function(test) {
    sinon.stub(utils, 'getClinicPhone').returns('+555');
    test.ok(!transition.filter({
        form: 'x',
        patient_id: 'x',
        transitions: {
            update_notifications: { last_rev: 9, seq: 1854, ok: true }
        }
    }));
    test.done();
};

exports['filter match'] = function(test) {
    sinon.stub(utils, 'getClinicPhone').returns('+555');
    test.ok(transition.filter({
        form: 'x',
        patient_id: 'x'
    }));
    test.done();
};

exports['returns false if not on or off form'] = function(test) {
    sinon.stub(transition, 'getConfig').returns({
        on_form: 'x',
        off_form: 'y'
    });

    transition.onMatch({
        doc: {
            form: 'z'
        }
    }, {}, {}, function(err, complete) {
        test.equals(complete, false);
        test.done();
    });
};

exports['no configured on or off form returns false'] = function(test) {
    sinon.stub(transition, 'getConfig').returns({});
    transition.onMatch({
        doc: {
            form: 'on',
            patient_id: 'x'
        }
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, false);
        test.done();
    });
};

exports['add error when event type not found'] = function(test) {
    var doc = {};
    var config = {
        messages: [{
            event_type: 'biz',
            message: [{
                content: 'baz',
                locale: 'en'
            }]
        }]
    };
    transition._addErr('foo', config, doc);
    test.same(doc.errors[0], {
        code:'invalid_report',
        message: 'Failed to complete notification request, event type "foo" misconfigured.'
    });
    test.done();
};

exports['add error when event type message not found'] = function(test) {
    var doc = {};
    var config = {
        messages: [{
            event_type: 'foo',
            message: []
        }]
    };
    transition._addErr('foo', config, doc);
    test.same(doc.errors[0], {
        code:'invalid_report',
        message: 'Failed to complete notification, event type "foo" misconfigured.'
    });
    test.done();
};

exports['add message creates error when event type not found'] = function(test) {
    var doc = {};
    var config = {
        messages: [{
            event_type: 'biz',
            message: [{
                content: 'baz',
                locale: 'en'
            }]
        }]
    };
    transition._addMsg('foo', config, doc);
    test.same(doc.errors[0], {
        code:'invalid_report',
        message: 'Failed to complete notification request, event type "foo" misconfigured.'
    });
    test.done();
};

exports['add message creates error when event type message not found'] = function(test) {
    var doc = {};
    var config = {
        messages: [{
            event_type: 'foo',
            message: []
        }]
    };
    transition._addMsg('foo', config, doc);
    test.same(doc.errors[0], {
        code:'invalid_report',
        message: 'Failed to complete notification request, event type "foo" misconfigured.'
    });
    test.done();
};

exports['add error when event type message not found'] = function(test) {
    var doc = {};
    var config = {
        messages: [{
            event_type: 'foo',
            message: []
        }]
    };
    transition._addErr('foo', config, doc);
    test.same(doc.errors[0], {
        code:'invalid_report',
        message: 'Failed to complete notification request, event type "foo" misconfigured.'
    });
    test.done();
};

exports['no configured on or off message returns false'] = function(test) {
    sinon.stub(transition, 'getConfig').returns({ off_form: 'off' });
    transition.onMatch({
        doc: {
            form: 'off',
            patient_id: 'x'
        }
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, false);
        test.done();
    });
};

exports['registration not found adds error and response'] = function(test) {
    var doc = {
        form: 'on',
        patient_id: 'x',
        contact: { phone: 'x' }
    };

    sinon.stub(transition, 'getConfig').returns({
        messages: [{
            event_type: 'on_unmute',
            message: [{
                content: 'Thank you {{contact.name}}',
                locale: 'en'
            }]
        }, {
            event_type: 'patient_not_found',
            message: [{
                content: 'not found {{patient_id}}',
                locale: 'en'
            }]
        }],
        on_form: 'on'
    });
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);

    transition.onMatch({
        doc: doc,
        form: 'on'
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.errors.length, 1);
        test.equals(doc.errors[0].message, 'not found x');
        test.equals(doc.tasks.length, 1);
        test.equals(doc.tasks[0].messages[0].message, 'not found x');
        test.equals(doc.tasks[0].messages[0].to, 'x');
        test.done();
    });
};

exports['validation failure adds error and response'] = function(test) {

    var doc = {
        form: 'on',
        patient_id: 'x',
        contact: { phone: 'x' }
    };

    sinon.stub(transition, 'getConfig').returns({
        validations: {
            join_responses: false,
            list: [
                {
                    property: 'patient_id',
                    rule: 'regex("^[0-9]{5}$")',
                    message: [{
                        content: 'patient id needs 5 numbers.',
                        locale: 'en'
                    }]
                }
            ]
        },
        messages: [{
            event_type: 'on_unmute',
            message: [{
                content: 'Thank you {{contact.name}}',
                locale: 'en'
            }]
        }],
        on_form: 'on'
    });

    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [{
        _id: 'x'
    }]);

    transition.onMatch({
        doc: doc,
        form: 'on'
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.errors.length, 1);
        test.equals(doc.errors[0].message, 'patient id needs 5 numbers.');
        test.equals(doc.tasks.length, 1);
        test.equals(doc.tasks[0].messages[0].message, 'patient id needs 5 numbers.');
        test.equals(doc.tasks[0].messages[0].to, 'x');
        test.done();
    });
};

exports['mute responds correctly'] = function(test) {

    var doc = {
        form: 'off',
        patient_id: '123',
        contact: {
            phone: '+1234',
            name: 'woot'
        }
    };

    var regDoc = {
        fields: {
            patient_name: 'Agatha'
        },
        scheduled_tasks: [{
            state: 'scheduled'
        }]
    };

    sinon.stub(transition, 'getConfig').returns({
        messages: [{
            event_type: 'on_mute',
            message: [{
                content: 'Thank you {{contact.name}}, no further notifications regarding {{fields.patient_name}} will be sent until you submit START {{patient_id}}.',
                locale: 'en'
            }]
        }],
        off_form: 'off'
    });

    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [{
        _id: 'x',
        doc: regDoc
    }]);

    var audit = {
        saveDoc: function(doc, callback) {
            callback();
        }
    };

    transition.onMatch({
        doc: doc,
        form: 'off'
    }, {}, audit, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.errors, undefined);
        test.equals(doc.tasks.length, 1);
        test.equals(
            doc.tasks[0].messages[0].message,
            'Thank you woot, no further notifications regarding Agatha will be sent until you submit START 123.'
        );
        test.equals(regDoc.scheduled_tasks[0].state, 'muted');
        test.done();
    });
};
