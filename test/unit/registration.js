var sinon = require('sinon'),
    transition = require('../../transitions/registration'),
    utils = require('../../lib/utils'),
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
    var change = { doc: {
        form: 'R',
        patient_id: '05649',
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
    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWith(1, null, []);
    transition.onMatch(change, db, audit, function() {
        test.equals(getRegistrations.callCount, 1);
        test.equals(getRegistrations.args[0][0].id, '05649');
        test.equals(view.callCount, 1);
        test.equals(view.args[0][0], 'medic-client');
        test.equals(view.args[0][1], 'people_by_phone');
        test.deepEqual(view.args[0][2].key, [ '+555123' ]);
        test.equals(view.args[0][2].include_docs, true);
        test.equals(view.args[0][0], 'medic-client');
        test.equals(saveDoc.callCount, 1);
        test.equals(saveDoc.args[0][0].name, 'jack');
        test.equals(saveDoc.args[0][0].parent._id, 'papa');
        test.equals(saveDoc.args[0][0].reported_date, 53);
        test.equals(saveDoc.args[0][0].type, 'person');
        test.equals(saveDoc.args[0][0].patient_id, '05649');
        test.done();
    });
};

exports['add_patient does nothing when patient already added'] = function(test) {
    var change = { doc: {
        form: 'R',
        patient_id: '05649',
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
        test.equals(getRegistrations.args[0][0].id, '05649');
        test.equals(saveDoc.callCount, 0);
        test.done();
    });
};

exports['add_patient uses given arg as patient name field name'] = function(test) {
    var change = { doc: {
        form: 'R',
        patient_id: '05649',
        reported_date: 53,
        from: '+555123',
        fields: { name: 'jim' }
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
        test.equals(saveDoc.args[0][0].name, 'jim');
        test.done();
    });
};
