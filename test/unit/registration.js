var sinon = require('sinon').sandbox.create(),
    transition = require('../../transitions/registration'),
    transitionUtils = require('../../transitions/utils'),
    messages = require('../../lib/messages'),
    utils = require('../../lib/utils'),
    schedules = require('../../lib/schedules'),
    config = require('../../config');

exports.tearDown = function(callback) {
    sinon.restore();
    callback();
};

exports['bool expr is true when property exists on doc'] = function(test) {
    test.equals(false, transition.isBoolExprFalse({foo: 'bar'}, 'doc.foo'));
    test.equals(false, transition.isBoolExprFalse(
        {foo: {bar: 'baz'}},
        'doc.foo.bar'
    ));
    test.done();
};

exports['bool expr supports complex logic'] = function(test) {
    test.equals(false, transition.isBoolExprFalse(
        {
            age_in_years: 21,
            last_mentrual_period: ''
        },
        'doc.age_in_years && doc.last_mentrual_period === \'\''
    ));
    test.equals(true, transition.isBoolExprFalse(
        {
            age_in_years: 21,
            last_mentrual_period: ''
        },
        '!(doc.age_in_years && doc.last_mentrual_period === \'\')'
    ));
    test.done();
};

exports['bool expr is false if property does not exist on doc'] = function(test) {
    test.equals(true, transition.isBoolExprFalse({}, 'doc.mouse'));
    test.equals(true, transition.isBoolExprFalse({}, 'doc.mouse.cheese'));
    test.equals(true, transition.isBoolExprFalse({}, 'nothing to see here'));
    test.done();
};

exports['bool expr is false if throws errors on bad syntax'] = function(test) {
    test.equals(true, transition.isBoolExprFalse({}, '+!;'));
    test.equals(true, transition.isBoolExprFalse({}, '.\'..'));
    test.done();
};

exports['bool expr is ignored (returns true) if not a string or empty'] = function(test) {
    test.equals(false, transition.isBoolExprFalse({}, {}));
    test.equals(false, transition.isBoolExprFalse({}, 1));
    test.equals(false, transition.isBoolExprFalse({}, false));
    test.equals(false, transition.isBoolExprFalse({}, undefined));
    test.equals(false, transition.isBoolExprFalse({}, ''));
    test.equals(false, transition.isBoolExprFalse({}, ' \t\n '));
    test.done();
};

exports['add_patient trigger creates a new patient'] = function(test) {
    var patientName = 'jack';
    var submitterId = 'papa';
    var patientId = '05649';
    var senderPhoneNumber = '+555123';
    var dob = '2017-03-31T01:15:09.000Z';
    var change = { doc: {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: senderPhoneNumber,
        fields: { patient_name: patientName },
        birth_date: dob
    } };
    // return expected view results when searching for contacts_by_phone
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
    var getPatientContactUuid = sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'add_patient' } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    sinon.stub(transitionUtils, 'addUniqueId').callsFake((db, doc, callback) => {
        doc.patient_id = patientId;
        callback();
    });

    transition.onMatch(change, db, audit, function() {
        test.equal(getPatientContactUuid.callCount, 1);
        test.equal(view.callCount, 1);
        test.equal(view.args[0][0], 'medic-client');
        test.equal(view.args[0][1], 'contacts_by_phone');
        test.equal(view.args[0][2].key, senderPhoneNumber);
        test.equal(view.args[0][2].include_docs, true);
        test.equal(saveDoc.callCount, 1);
        test.equal(saveDoc.args[0][0].name, patientName);
        test.equal(saveDoc.args[0][0].parent._id, submitterId);
        test.equal(saveDoc.args[0][0].reported_date, 53);
        test.equal(saveDoc.args[0][0].type, 'person');
        test.equal(saveDoc.args[0][0].patient_id, patientId);
        test.equal(saveDoc.args[0][0].date_of_birth, dob);
        test.done();
    });
};

exports['add_patient does nothing when patient already added'] = function(test) {
    var patientId = '05649';
    var change = { doc: {
        type: 'data_record',
        form: 'R',
        patient_id: patientId,
        reported_date: 53,
        from: '+555123',
        fields: { patient_name: 'jack' }
    } };
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'add_patient_id' } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    transition.onMatch(change, db, audit, function() {
        test.equals(saveDoc.callCount, 0);
        test.done();
    });
};

exports['add_patient uses a given id if configured to'] = function(test) {
    var patientId = '05648';
    var doc = {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: '+555123',
        fields: { patient_name: 'jack', external_id: patientId},
        birth_date: '2017-03-31T01:15:09.000Z'
    };
    var change = { doc: doc };
    // return expected view results when searching for contacts_by_phone
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ {
            name: 'on_create',
            trigger: 'add_patient_id',
            params: '{"patient_id_field": "external_id"}'
        } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    sinon.stub(transitionUtils, 'isIdUnique').callsArgWith(2, null, true);

    transition.onMatch(change, db, audit, function() {
        test.equal(saveDoc.args[0][0].patient_id, patientId);
        test.equal(doc.patient_id, patientId);
        test.equal(doc.errors, undefined);
        test.done();
    });
};

exports['add_patient errors if the configuration doesnt point to an id'] = function(test) {
    var patientId = '05648';
    var doc = {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: '+555123',
        fields: { patient_name: 'jack', external_id: patientId},
        birth_date: '2017-03-31T01:15:09.000Z'
    };
    var change = { doc: doc };
    // return expected view results when searching for contacts_by_phone
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ {
            name: 'on_create',
            trigger: 'add_patient',
            params: '{"patient_id_field": "not_the_external_id"}'
        } ]
    };
    var configGet = sinon.stub(config, 'get');
    configGet.withArgs('outgoing_deny_list').returns('');
    configGet.returns([ eventConfig ]);

    sinon.stub(transition, 'validate').callsArgWith(2);

    transition.onMatch(change, db, audit, function() {
        test.equal(doc.patient_id, undefined);
        test.deepEqual(doc.errors, [{message: 'messages.generic.no_provided_patient_id', code: 'invalid_report'}]);
        test.done();
    });
};

exports['add_patient errors if the given id is not unique'] = function(test) {
    var patientId = '05648';
    var doc = {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: '+555123',
        fields: { patient_name: 'jack', external_id: patientId},
        birth_date: '2017-03-31T01:15:09.000Z'
    };
    var change = { doc: doc };
    // return expected view results when searching for contacts_by_phone
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ {
            name: 'on_create',
            trigger: 'add_patient',
            params: '{"patient_id_field": "external_id"}'
        } ]
    };
    var configGet = sinon.stub(config, 'get');
    configGet.withArgs('outgoing_deny_list').returns('');
    configGet.returns([ eventConfig ]);

    sinon.stub(transitionUtils, 'isIdUnique').callsArgWith(2, null, false);

    sinon.stub(transition, 'validate').callsArgWith(2);

    transition.onMatch(change, db, audit, function() {
        test.equal(doc.patient_id, undefined);
        test.deepEqual(doc.errors, [{message: 'messages.generic.provided_patient_id_not_unique', code: 'invalid_report'}]);
        test.done();
    });
};

exports['add_patient event parameter overwrites the default property for the name of the patient'] = function(test) {
    var patientName = 'jack';
    var submitterId = 'papa';
    var patientId = '05649';
    var senderPhoneNumber = '+555123';
    var dob = '2017-03-31T01:15:09.000Z';
    var change = { doc: {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: senderPhoneNumber,
        fields: { name: patientName },
        birth_date: dob
    } };
    // return expected view results when searching for contacts_by_phone
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'add_patient', params: 'name' } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

    sinon.stub(transitionUtils, 'addUniqueId').callsFake((db, doc, callback) => {
        doc.patient_id = patientId;
        callback();
    });

    transition.onMatch(change, db, audit, function() {
        test.equals(saveDoc.callCount, 1);
        test.equals(saveDoc.args[0][0].name, patientName);
        test.done();
    });
};

exports['add_patient event parameter overwrites the default property for the name of the patient using JSON config'] = function(test) {
    var patientName = 'jack';
    var submitterId = 'papa';
    var patientId = '05649';
    var senderPhoneNumber = '+555123';
    var dob = '2017-03-31T01:15:09.000Z';
    var change = { doc: {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: senderPhoneNumber,
        fields: { name: patientName },
        birth_date: dob
    } };
    // return expected view results when searching for contacts_by_phone
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'add_patient', params: '{"patient_name_field": "name"}' } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

    sinon.stub(transitionUtils, 'addUniqueId').callsFake((db, doc, callback) => {
        doc.patient_id = patientId;
        callback();
    });

    transition.onMatch(change, db, audit, function() {
        test.equals(saveDoc.callCount, 1);
        test.equals(saveDoc.args[0][0].name, patientName);
        test.done();
    });
};

exports['add_patient and add_patient_id triggers are idempotent'] = function(test) {
    var patientName = 'jack';
    var submitterId = 'papa';
    var patientId = '05649';
    var senderPhoneNumber = '+555123';
    var dob = '2017-03-31T01:15:09.000Z';
    var change = { doc: {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: senderPhoneNumber,
        fields: { name: patientName },
        birth_date: dob
    } };
    // return expected view results when searching for contacts_by_phone
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2);
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [
            { name: 'on_create', trigger: 'add_patient', params: 'name' },
            { name: 'on_create', trigger: 'add_patient_id', params: 'name' }
        ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);

    sinon.stub(transitionUtils, 'addUniqueId').callsFake((db, doc, callback) => {
        doc.patient_id = patientId;
        callback();
    });

    transition.onMatch(change, db, audit, function() {
        test.equals(saveDoc.callCount, 1);
        test.equals(saveDoc.args[0][0].name, patientName);
        test.done();
    });
};


exports['assign_schedule event creates the named schedule'] = function(test) {
    var change = { doc: {
        type: 'data_record',
        form: 'R',
        reported_date: 53,
        from: '+555123',
        fields: { patient_id: '05649' }
    } };
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'assign_schedule', params: 'myschedule' } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [ { _id: 'xyz' } ]);
    sinon.stub(schedules, 'getScheduleConfig').returns('someschedule');
    sinon.stub(utils, 'getPatientContactUuid').callsArgWith(2, null, {_id: 'uuid'});
    var assignSchedule = sinon.stub(schedules, 'assignSchedule').returns(true);
    transition.onMatch(change, db, audit, function() {
        test.equals(assignSchedule.callCount, 1);
        test.equals(assignSchedule.args[0][1], 'someschedule');
        test.equals(assignSchedule.args[0][2][0]._id, 'xyz');
        test.equals(getRegistrations.callCount, 1);
        test.done();
    });
};

exports['filter returns false for reports for unknown json form'] = function(test) {
    var doc = { form: 'R', type: 'data_record'};
    var getForm = sinon.stub(utils, 'getForm').returns(null);
    var actual = transition.filter(doc);
    test.equals(getForm.callCount, 1);
    test.equals(getForm.args[0][0], 'R');
    test.equals(actual, false);
    test.done();
};

exports['filter returns false for reports with no registration configured'] = function(test) {
    var doc = { form: 'R', type: 'data_record' };
    var getForm = sinon.stub(utils, 'getForm').returns({ public_form: false });
    var configGet = sinon.stub(config, 'get').returns([{ form: 'XYZ' }]);
    var actual = transition.filter(doc);
    test.equals(getForm.callCount, 1);
    test.equals(getForm.args[0][0], 'R');
    test.equals(configGet.callCount, 1);
    test.equals(configGet.args[0][0], 'registrations');
    test.equals(actual, false);
    test.done();
};

exports['filter returns true for reports from known clinic'] = function(test) {
    var doc = { form: 'R', type: 'data_record'};
    var getForm = sinon.stub(utils, 'getForm').returns({ public_form: false });
    var configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
    var getClinicPhone = sinon.stub(utils, 'getClinicPhone').returns('+55555555');
    var actual = transition.filter(doc);
    test.equals(getForm.callCount, 1);
    test.equals(getForm.args[0][0], 'R');
    test.equals(configGet.callCount, 1);
    test.equals(configGet.args[0][0], 'registrations');
    test.equals(getClinicPhone.callCount, 1);
    test.equals(actual, true);
    test.done();
};

exports['filter returns false for reports from unknown clinic'] = function(test) {
    var doc = { form: 'R', type: 'data_record'};
    var getForm = sinon.stub(utils, 'getForm').returns({ public_form: false });
    var configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
    var getClinicPhone = sinon.stub(utils, 'getClinicPhone').returns(null);
    var actual = transition.filter(doc);
    test.equals(getForm.callCount, 1);
    test.equals(getForm.args[0][0], 'R');
    test.equals(configGet.callCount, 1);
    test.equals(configGet.args[0][0], 'registrations');
    test.equals(getClinicPhone.callCount, 1);
    test.equals(actual, false);
    test.done();
};

exports['filter returns true for reports for public forms from unknown clinic'] = function(test) {
    var doc = { form: 'R', type: 'data_record'};
    var getForm = sinon.stub(utils, 'getForm').returns({ public_form: true });
    var configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
    var getClinicPhone = sinon.stub(utils, 'getClinicPhone').returns(null);
    var actual = transition.filter(doc);
    test.equals(getForm.callCount, 1);
    test.equals(getForm.args[0][0], 'R');
    test.equals(configGet.callCount, 1);
    test.equals(configGet.args[0][0], 'registrations');
    test.equals(getClinicPhone.callCount, 1);
    test.equals(actual, true);
    test.done();
};

exports['filter returns true for xforms reports'] = function(test) {
    var doc = { form: 'R', content_type: 'xml', type: 'data_record' };
    var getForm = sinon.stub(utils, 'getForm').returns(null);
    var configGet = sinon.stub(config, 'get').returns([{ form: 'R' }]);
    var actual = transition.filter(doc);
    test.equals(getForm.callCount, 1);
    test.equals(getForm.args[0][0], 'R');
    test.equals(configGet.callCount, 1);
    test.equals(configGet.args[0][0], 'registrations');
    test.equals(actual, true);
    test.done();
};

exports['trigger param configuration supports strings'] = function (test) {
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'testparamparsing', params: 'foo' } ]
    };

    transition.triggers.testparamparsing = function(options, cb) {
        cb(options);
    };

    transition.fireConfiguredTriggers({}, {}, eventConfig, {}, function(options) {
        test.deepEqual(options.params, ['foo']);

        test.done();
    });
};

exports['trigger param configuration supports comma-delimited strings as array'] = function (test) {
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'testparamparsing', params: 'foo,bar' } ]
    };

    transition.triggers.testparamparsing = function(options, cb) {
        cb(options);
    };

    transition.fireConfiguredTriggers({}, {}, eventConfig, {}, function(options) {
        test.deepEqual(options.params, ['foo', 'bar']);

        test.done();
    });
};

exports['trigger param configuration supports arrays as a string'] = function (test) {
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'testparamparsing', params: '["foo","bar", 3]' } ]
    };

    transition.triggers.testparamparsing = function(options, cb) {
        cb(options);
    };

    transition.fireConfiguredTriggers({}, {}, eventConfig, {}, function(options) {
        test.deepEqual(options.params, ['foo', 'bar', 3]);

        test.done();
    });
};

exports['trigger param configuration supports JSON as a string'] = function (test) {
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'testparamparsing', params: '{"foo": "bar"}' } ]
    };

    transition.triggers.testparamparsing = function(options, cb) {
        cb(options);
    };

    transition.fireConfiguredTriggers({}, {}, eventConfig, {}, function(options) {
        test.deepEqual(options.params, {foo: 'bar'});

        test.done();
    });
};

exports['trigger param configuration supports direct JSON'] = function (test) {
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'testparamparsing', params: {foo: 'bar'} } ]
    };

    transition.triggers.testparamparsing = function(options, cb) {
        cb(options);
    };

    transition.fireConfiguredTriggers({}, {}, eventConfig, {}, function(options) {
        test.deepEqual(options.params, {foo: 'bar'});

        test.done();
    });
};

exports['trigger param configuration parse failure for invalid JSON propagates to the callbacks'] = function (test) {
    var eventConfig = {
        form: 'R',
        //                                                                                v missing end }
        events: [ { name: 'on_create', trigger: 'testparamparsing', params: '{"foo": "bar"' } ]
    };

    transition.triggers.testparamparsing = function(options, cb) {
        cb(options);
    };

    transition.fireConfiguredTriggers({}, {}, eventConfig, {}, function(err) {
        test.ok(err instanceof Error);

        test.done();
    });
};

exports['addMessage prepops and passes the right information to messages.addMessage'] = (test) => {
    const testPhone = '1234',
          testMessage = 'A Test Message',
          testRegistration = 'some registrations',
          testPerson = 'a patient contact';

    sinon.stub(messages, 'getRecipientPhone').returns(testPhone);
    sinon.stub(messages, 'getMessage').returns(testMessage);
    const addMessage = sinon.stub(messages, 'addMessage');

    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, testRegistration);
    sinon.stub(utils, 'getPatientContact').callsArgWith(2, null, testPerson);

    const testConfig = {
        messages: [{
        },
        {
            event_type: 'report_accepted'
        }]
    };
    const testDoc = {
        fields: {
            patient_id: '12345'
        }
    };

    transition.addMessages({}, testConfig, testDoc, err => {
        test.equal(err, undefined);
        test.equal(addMessage.callCount, 2);

        const expected = {
            doc: testDoc,
            phone: testPhone,
            message: testMessage,
            options: { next_msg: { minutes: 0, hours: 0, days: 0, weeks: 0, months: 0, years: 0 } },
            registrations: testRegistration,
            person: testPerson
        };

        test.deepEqual(addMessage.args[0][0], expected);
        test.deepEqual(addMessage.args[1][0], expected);
        test.done();
    });
};
