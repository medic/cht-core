var _ = require('underscore'),
    transition = require('../../transitions/registration'),
    schedules = require('../../lib/schedules'),
    sinon = require('sinon').sandbox.create(),
    moment = require('moment'),
    utils = require('../../lib/utils'),
    uuid = require('uuid'),
    contact = {
        phone: '+1234',
        name: 'Julie',
        parent: {
            contact: {
                phone: '+1234',
                name: 'Julie'
            }
        }
    };

function getMessage(doc, idx) {
    if (!doc || !doc.tasks) {
        return;
    }
    if (idx) {
        if (!doc.tasks[idx]) {
            return;
        }
        return _.first(doc.tasks[idx].messages);
    }
    return _.first(_.first(doc.tasks).messages);
}

function getScheduledMessage(doc, idx) {
    if (!doc || !doc.scheduled_tasks) {
        return;
    }
    if (idx) {
        if (!doc.scheduled_tasks[idx]) {
            return;
        }
        return _.first(doc.scheduled_tasks[idx].messages);
    }
    return _.first(_.first(doc.scheduled_tasks).messages);
}

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['registration sets up schedule'] = function(test) {

    test.expect(15);
    sinon.stub(transition, 'getConfig').returns([{
        form: 'PATR',
        events: [
           {
               name: 'on_create',
               trigger: 'assign_schedule',
               params: 'group1',
               bool_expr: ''
           }
        ],
        validations: [],
        messages: [
            {
                message: [{
                    content: 'thanks {{contact.name}}',
                    locale: 'en'
                }],
                recipient: 'reporting_unit'
            }
        ]
    }]);
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(schedules, 'getScheduleConfig').returns({
        name: 'group1',
        start_from: 'reported_date',
        registration_response: '',
        messages: [
            {
                message: [{
                    content: 'Mustaches.  Overrated or underrated?',
                    locale: 'en'
                }],
                group: 1,
                offset: '12 weeks',
                send_time: '',
                recipient: 'reporting_unit'
            }
        ]
    });
    sinon.stub(uuid, 'v4').returns('test-uuid');

    var doc = {
        reported_date: moment().toISOString(),
        form: 'PATR',
        from: contact.phone,
        contact: contact
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(doc.scheduled_tasks);
        test.equals(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.ok(msg0);
        test.ok(msg0.uuid);
        test.ok(msg0.to);
        test.ok(msg0.message);
        if (msg0) {
            delete msg0.uuid;
            test.deepEqual(msg0, {
                to: '+1234',
                message: 'thanks Julie'
            });
        }

        /*
         * Also checks that recipient using doc property value is resolved
         * correctly.
         * */
        var msg1 = getScheduledMessage(doc, 0);
        test.ok(msg1);
        test.ok(msg1.to);
        test.ok(msg1.message);
        if (msg1) {
            test.deepEqual(msg1, {
                to: '+1234',
                message: 'Mustaches.  Overrated or underrated?',
                uuid: 'test-uuid'
            });
        }
        test.done();
    });
};

exports['registration sets up schedule using translation_key'] = function(test) {

    test.expect(13);
    sinon.stub(transition, 'getConfig').returns([{
        form: 'PATR',
        events: [{
           name: 'on_create',
           trigger: 'assign_schedule',
           params: 'group1',
           bool_expr: ''
       }],
        validations: [],
        messages: [{
            translation_key: 'thanks',
            recipient: 'reporting_unit'
        }]
    }]);
    sinon.stub(schedules, 'getScheduleConfig').returns({
        name: 'group1',
        start_from: 'reported_date',
        registration_response: '',
        messages: [{
            translation_key: 'facial.hair',
            group: 1,
            offset: '12 weeks',
            send_time: '',
            recipient: 'reporting_unit'
        }]
    });
    sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, {_id: 'uuid'});
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(utils, 'translate')
        .withArgs('thanks', 'en').returns('thanks {{contact.name}}')
        .withArgs('facial.hair', 'en').returns('Mustaches.  Overrated or underrated?');
    sinon.stub(uuid, 'v4').returns('test-uuid');

    var doc = {
        reported_date: moment().toISOString(),
        form: 'PATR',
        from: contact.phone,
        contact: contact
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(doc.scheduled_tasks);
        test.equals(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.ok(msg0);
        test.ok(msg0.uuid);
        test.ok(msg0.to);
        test.ok(msg0.message);
        if (msg0) {
            delete msg0.uuid;
            test.deepEqual(msg0, {
                to: '+1234',
                message: 'thanks Julie'
            });
        }

        // check that message generation is deferred until later
        test.equals(doc.scheduled_tasks.length, 1);
        test.equals(doc.scheduled_tasks[0].messages, undefined);
        test.done();
    });
};

exports['registration sets up schedule using bool_expr'] = function(test) {

    test.expect(15);
    sinon.stub(transition, 'getConfig').returns([{
        form: 'PATR',
        events: [
           {
               name: 'on_create',
               trigger: 'assign_schedule',
               params: 'group1',
               bool_expr: 'doc.foo === "baz"'
           }
        ],
        validations: [],
        messages: [
            {
                message: [{
                    content: 'thanks {{contact.name}}',
                    locale: 'en'
                }],
                recipient: 'reporting_unit'
            }
        ]
    }]);
    sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, {_id: 'uuid'});
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(schedules, 'getScheduleConfig').returns({
        name: 'group1',
        start_from: 'reported_date',
        registration_response: '',
        messages: [
            {
                message: [{
                    content: 'Mustaches.  Overrated or underrated?',
                    locale: 'en'
                }],
                group: 1,
                offset: '12 weeks',
                send_time: '',
                recipient: 'reporting_unit'
            }
        ]
    });
    sinon.stub(uuid, 'v4').returns('test-uuid');

    var doc = {
        reported_date: moment().toISOString(),
        form: 'PATR',
        from: contact.phone,
        contact: contact,
        foo: 'baz'
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(doc.scheduled_tasks);
        test.equals(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.ok(msg0);
        test.ok(msg0.uuid);
        test.ok(msg0.to);
        test.ok(msg0.message);
        if (msg0) {
            delete msg0.uuid;
            test.deepEqual(msg0, {
                to: '+1234',
                message: 'thanks Julie'
            });
        }

        /*
         * Also checks that recipient using doc property value is resolved
         * correctly.
         * */
        var msg1 = getScheduledMessage(doc, 0);
        test.ok(msg1);
        test.ok(msg1.to);
        test.ok(msg1.message);
        if (msg1) {
            test.deepEqual(msg1, {
                to: '+1234',
                message: 'Mustaches.  Overrated or underrated?',
                uuid: 'test-uuid'
            });
        }
        test.done();
    });
};

exports['two phase registration sets up schedule using bool_expr'] = function(test) {

    test.expect(17);
    sinon.stub(transition, 'getConfig').returns([{
        form: 'PATR',
        events: [
           {
               name: 'on_create',
               trigger: 'assign_schedule',
               params: 'group1',
               bool_expr: 'doc.foo === "baz"'
           }
        ],
        validations: [],
        messages: [
            {
                message: [{
                    content: 'thanks for registering {{patient_name}}',
                    locale: 'en'
                }],
                recipient: 'reporting_unit'
            }
        ]
    }]);
    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, [ { fields: { patient_name: 'barry' } } ]);
    sinon.stub(schedules, 'getScheduleConfig').returns({
        name: 'group1',
        start_from: 'reported_date',
        registration_response: '',
        messages: [
            {
                message: [{
                    content: 'Remember to visit {{patient_name}}',
                    locale: 'en'
                }],
                group: 1,
                offset: '12 weeks',
                send_time: '',
                recipient: 'reporting_unit'
            }
        ]
    });
    sinon.stub(uuid, 'v4').returns('test-uuid');

    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});
    var doc = {
        reported_date: moment().toISOString(),
        form: 'PATR',
        from: contact.phone,
        contact: contact,
        foo: 'baz',
        fields: { patient_id: '123' },
        patient: {
            _id: 'uuid'
        }
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(doc.scheduled_tasks);
        test.equals(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.ok(msg0);
        test.ok(msg0.uuid);
        test.ok(msg0.to);
        test.ok(msg0.message);
        if (msg0) {
            delete msg0.uuid;
            test.deepEqual(msg0, {
                to: '+1234',
                message: 'thanks for registering barry'
            });
        }

        /*
         * Also checks that recipient using doc property value is resolved
         * correctly.
         * */
        var msg1 = getScheduledMessage(doc, 0);
        test.ok(msg1);
        test.ok(msg1.to);
        test.ok(msg1.message);
        if (msg1) {
            test.deepEqual(msg1, {
                to: '+1234',
                message: 'Remember to visit barry',
                uuid: 'test-uuid'
            });
        }

        test.equals(getRegistrations.callCount, 2);
        test.equals(getRegistrations.args[0][0].id, '123');
        test.done();
    });
};

exports['no schedule using false bool_expr'] = function(test) {

    test.expect(10);
    sinon.stub(transition, 'getConfig').returns([{
        form: 'PATR',
        events: [
           {
               name: 'on_create',
               trigger: 'assign_schedule',
               params: 'group1',
               bool_expr: 'doc.foo === "notbaz"'
           }
        ],
        validations: [],
        messages: [
            {
                message: [{
                    content: 'thanks {{contact.name}}',
                    locale: 'en'
                }],
                recipient: 'reporting_unit'
            }
        ]
    }]);
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, {_id: 'uuid'});
    sinon.stub(schedules, 'getScheduleConfig').returns({
        name: 'group1',
        start_from: 'reported_date',
        registration_response: '',
        messages: [
            {
                message: [{
                    content: 'Mustaches.  Overrated or underrated?',
                    locale: 'en'
                }],
                group: 1,
                offset: '12 weeks',
                send_time: '',
                recipient: 'reporting_unit'
            }
        ]
    });

    var doc = {
        reported_date: moment().toISOString(),
        form: 'PATR',
        contact: contact,
        foo: 'baz'
    };

    transition.onMatch({
        doc: doc
    }, {}, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(!doc.scheduled_tasks);

        var msg0 = getMessage(doc, 0);
        test.ok(msg0);
        test.ok(msg0.uuid);
        test.ok(msg0.to);
        test.ok(msg0.message);
        if (msg0) {
            delete msg0.uuid;
            test.deepEqual(msg0, {
                to: '+1234',
                message: 'thanks Julie'
            });
        }

        test.done();
    });
};
