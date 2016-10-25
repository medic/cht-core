var sinon = require('sinon'),
    transition = require('../../transitions/registration'),
    utils = require('../../lib/utils'),
    schedules = require('../../lib/schedules'),
    config = require('../../config');

exports.tearDown = function(callback) {
    if (config.get.restore) {
        config.get.restore();
    }
    if (transition.validate.restore) {
        transition.validate.restore();
    }
    if (utils.getRegistrations.restore) {
        utils.getRegistrations.restore();
    }
    if (schedules.getScheduleConfig.restore) {
        schedules.getScheduleConfig.restore();
    }
    if (schedules.assignSchedule.restore) {
        schedules.assignSchedule.restore();
    }
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
    var change = { doc: {
        form: 'R',
        patient_id: patientId,
        reported_date: 53,
        from: senderPhoneNumber,
        fields: { patient_name: patientName }
    } };
    // return expected view results when searching for people_by_phone
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: submitterId } } } ] });
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'add_patient' } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    transition.onMatch(change, db, audit, function() {
        test.equals(getRegistrations.callCount, 1);
        test.equals(getRegistrations.args[0][0].id, patientId);
        test.equals(view.callCount, 1);
        test.equals(view.args[0][0], 'medic-client');
        test.equals(view.args[0][1], 'people_by_phone');
        test.deepEqual(view.args[0][2].key, [ senderPhoneNumber ]);
        test.equals(view.args[0][2].include_docs, true);
        test.equals(saveDoc.callCount, 1);
        test.equals(saveDoc.args[0][0].name, patientName);
        test.equals(saveDoc.args[0][0].parent._id, submitterId);
        test.equals(saveDoc.args[0][0].reported_date, 53);
        test.equals(saveDoc.args[0][0].type, 'person');
        test.equals(saveDoc.args[0][0].patient_id, patientId);
        test.done();
    });
};

exports['add_patient does nothing when patient already added'] = function(test) {
    var patientId = '05649';
    var change = { doc: {
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
        events: [ { name: 'on_create', trigger: 'add_patient' } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [ { _id: 'xyz' } ]);
    transition.onMatch(change, db, audit, function() {
        test.equals(getRegistrations.callCount, 1);
        test.equals(getRegistrations.args[0][0].id, patientId);
        test.equals(saveDoc.callCount, 0);
        test.done();
    });
};

exports['add_patient event parameter overwrites the default property for the name of the patient'] = function(test) {
    var patientName = 'jim';
    var change = { doc: {
        form: 'R',
        patient_id: '05649',
        reported_date: 53,
        from: '+555123',
        fields: { name: patientName }
    } };
    var view = sinon.stub().callsArgWith(3, null, { rows: [ { doc: { parent: { _id: 'papa' } } } ] });
    var db = { medic: { view: view } };
    var saveDoc = sinon.stub().callsArgWith(1);
    var audit = { saveDoc: saveDoc };
    var eventConfig = {
        form: 'R',
        events: [ { name: 'on_create', trigger: 'add_patient', params: 'name' } ]
    };
    sinon.stub(config, 'get').returns([ eventConfig ]);
    sinon.stub(transition, 'validate').callsArgWith(2);
    sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, [ ]);
    transition.onMatch(change, db, audit, function() {
        test.equals(saveDoc.callCount, 1);
        test.equals(saveDoc.args[0][0].name, patientName);
        test.done();
    });
};

exports['assign_schedule event creates the named schedule'] = function(test) {
    var change = { doc: {
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
    var assignSchedule = sinon.stub(schedules, 'assignSchedule').returns(true);
    transition.onMatch(change, db, audit, function() {
        test.equals(assignSchedule.callCount, 1);
        test.equals(assignSchedule.args[0][1], 'someschedule');
        test.equals(assignSchedule.args[0][2][0]._id, 'xyz');
        test.equals(getRegistrations.callCount, 1);
        test.done();
    });
};
