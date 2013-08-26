var _ = require('underscore'),
    moment = require('moment'),
    sinon = require('sinon'),
    transition = require('../../transitions/update_sent_forms');

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    callback();
}

exports['onMatch is a function'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.done();
};

exports['calls db.getDoc with id of clinic'] = function(test) {
    var db = {
        getDoc: function() {},
        saveDoc: function() {}
    };

    sinon.stub(db, 'getDoc').callsArgWith(1, null, {});
    save = sinon.stub(db, 'saveDoc').callsArgWith(1, null);

    transition.onMatch({
        doc: {
            related_entities: {
                clinic: {
                    _id: '1'
                }
            }
        }
    }, db, function(err, complete) {
        var call;

        test.equals(db.getDoc.callCount, 1);

        call = db.getDoc.getCall(0);
        test.equals(call.args[0], '1');

        test.done();
    });
};

exports['calls db.saveDoc with clinic and updated sent_forms'] = function(test) {
    var db,
        get,
        save,
        now = moment();

    db = {
        getDoc: function() {},
        saveDoc: function() {}
    };

    get = sinon.stub(db, 'getDoc').callsArgWith(1, null, {});
    save = sinon.stub(db, 'saveDoc').callsArgWith(1, null);

    transition.onMatch({
        doc: {
            related_entities: {
                clinic: {
                    _id: '1'
                }
            },
            form: 'XXX',
            reported_date: now.valueOf()
        }
    }, db, function(err, complete) {
        var call,
            clinic;

        call = save.getCall(0);
        clinic = call.args[0];

        test.ok(clinic.sent_forms);
        test.ok(clinic.sent_forms['XXX']);
        test.equals(clinic.sent_forms['XXX'], now.toISOString());

        test.done();
    });
}

exports['does not overwrite if existing date is after'] = function(test) {
    var db,
        get,
        save,
        now = moment(),
        tomorrow = now.clone().add(1, 'day');

    db = {
        getDoc: function() {},
        saveDoc: function() {}
    };

    get = sinon.stub(db, 'getDoc').callsArgWith(1, null, {
        sent_forms: {
            XXX: tomorrow.toISOString()
        }
    });
    save = sinon.stub(db, 'saveDoc').callsArgWith(1, null);

    transition.onMatch({
        doc: {
            related_entities: {
                clinic: {
                    _id: '1'
                }
            },
            form: 'XXX',
            reported_date: now.valueOf()
        }
    }, db, function(err, complete) {
        var call,
            clinic;

        call = save.getCall(0);
        clinic = call.args[0];

        test.ok(clinic.sent_forms);
        test.ok(clinic.sent_forms['XXX']);
        test.equals(clinic.sent_forms['XXX'], tomorrow.toISOString());

        test.done();
    });
}

exports['overwrites if existing date is before'] = function(test) {
    var db,
        get,
        save,
        now = moment(),
        yesterday = now.clone().subtract(1, 'day');

    db = {
        getDoc: function() {},
        saveDoc: function() {}
    };

    get = sinon.stub(db, 'getDoc').callsArgWith(1, null, {
        sent_forms: {
            XXX: yesterday.toISOString()
        }
    });
    save = sinon.stub(db, 'saveDoc').callsArgWith(1, null);

    transition.onMatch({
        doc: {
            related_entities: {
                clinic: {
                    _id: '1'
                }
            },
            form: 'XXX',
            reported_date: now.valueOf()
        }
    }, db, function(err, complete) {
        var call,
            clinic;

        call = save.getCall(0);
        clinic = call.args[0];

        test.ok(clinic.sent_forms);
        test.ok(clinic.sent_forms['XXX']);
        test.equals(clinic.sent_forms['XXX'], now.toISOString());

        test.done();
    });
}
