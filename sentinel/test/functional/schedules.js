var transition = require('../../transitions/registration'),
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

const getMessage = (doc, idx) =>
    doc &&
    doc.tasks &&
    doc.tasks.length &&
    doc.tasks[idx] &&
    doc.tasks[idx].messages &&
    doc.tasks[idx].messages.length &&
    doc.tasks[idx].messages[0];

const getScheduledMessage = (doc, idx) =>
    doc &&
    doc.scheduled_tasks &&
    doc.scheduled_tasks.length &&
    doc.scheduled_tasks[idx] &&
    doc.scheduled_tasks[idx].messages &&
    doc.scheduled_tasks[idx].messages.length &&
    doc.scheduled_tasks[idx].messages[0];

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['registration sets up schedule'] = function(test) {

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

    transition.onMatch({ doc: doc }).then(complete => {
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(doc.scheduled_tasks);
        test.equals(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.deepEqual(msg0, {
            uuid: 'test-uuid',
            to: '+1234',
            message: 'thanks Julie'
        });

        /*
         * Also checks that recipient using doc property value is resolved
         * correctly.
         * */
        var msg1 = getScheduledMessage(doc, 0);
        test.deepEqual(msg1, {
            to: '+1234',
            message: 'Mustaches.  Overrated or underrated?',
            uuid: 'test-uuid'
        });
        test.done();
    });
};

exports['registration sets up schedule using translation_key'] = function(test) {

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

    transition.onMatch({ doc: doc }).then(complete => {
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(doc.scheduled_tasks);
        test.equals(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.deepEqual(msg0, {
            uuid: 'test-uuid',
            to: '+1234',
            message: 'thanks Julie'
        });

        // check that message generation is deferred until later
        test.equals(doc.scheduled_tasks.length, 1);
        test.equals(doc.scheduled_tasks[0].messages, undefined);
        test.done();
    });
};

exports['registration sets up schedule using bool_expr'] = function(test) {

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

    transition.onMatch({ doc: doc }).then(complete => {
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(doc.scheduled_tasks);
        test.equals(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.deepEqual(msg0, {
            uuid: 'test-uuid',
            to: '+1234',
            message: 'thanks Julie'
        });

        /*
         * Also checks that recipient using doc property value is resolved
         * correctly.
         * */
        var msg1 = getScheduledMessage(doc, 0);
        test.deepEqual(msg1, {
            to: '+1234',
            message: 'Mustaches.  Overrated or underrated?',
            uuid: 'test-uuid'
        });
        test.done();
    });
};

exports['patients chp is resolved correctly as recipient'] = function(test) {
    sinon.stub(transition, 'getConfig').returns([{
        form: 'PATR',
        events: [],
        validations: [],
        messages: [{
            translation_key: 'thanks',
            recipient: 'patient.parent.contact.phone'
        }]
    }]);
    sinon.stub(schedules, 'getScheduleConfig').returns({});
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});
    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);
    sinon.stub(utils, 'translate').withArgs('thanks', 'en').returns('thanks');
    sinon.stub(uuid, 'v4').returns('test-uuid');

    var doc = {
        reported_date: moment().toISOString(),
        form: 'PATR',
        from: contact.phone,
        contact: contact,
        fields: { patient_id: '98765' },
        patient: { parent: { contact: { phone: '+5551596' } } }
    };

    transition.onMatch({ doc: doc }).then(complete => {
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.deepEqual(msg0, {
            uuid: 'test-uuid',
            to: '+5551596',
            message: 'thanks'
        });

        test.done();
    });
};

exports['two phase registration sets up schedule using bool_expr'] = function(test) {

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

    transition.onMatch({ doc: doc }).then(complete => {
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(doc.scheduled_tasks);
        test.equals(doc.scheduled_tasks && doc.scheduled_tasks.length, 1);

        var msg0 = getMessage(doc, 0);
        test.deepEqual(msg0, {
            uuid: 'test-uuid',
            to: '+1234',
            message: 'thanks for registering barry'
        });

        /*
         * Also checks that recipient using doc property value is resolved
         * correctly.
         * */
        var msg1 = getScheduledMessage(doc, 0);
        test.deepEqual(msg1, {
            to: '+1234',
            message: 'Remember to visit barry',
            uuid: 'test-uuid'
        });

        test.equals(getRegistrations.callCount, 2);
        test.equals(getRegistrations.args[0][0].id, '123');
        test.done();
    });
};

exports['no schedule using false bool_expr'] = function(test) {

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
    sinon.stub(uuid, 'v4').returns('test-uuid');
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

    transition.onMatch({ doc: doc }).then(complete => {
        test.equals(complete, true);
        test.ok(doc.tasks);
        test.equals(doc.tasks && doc.tasks.length, 1);
        test.ok(!doc.scheduled_tasks);

        var msg0 = getMessage(doc, 0);
        test.deepEqual(msg0, {
            uuid: 'test-uuid',
            to: '+1234',
            message: 'thanks Julie'
        });

        test.done();
    });
};
