var moment = require('moment'),
    sinon = require('sinon'),
    transition = require('../../transitions/update_sent_forms');

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    callback();
};

exports['calls db.get with id of clinic'] = function(test) {
    test.expect(2);
    var db = {
        medic: {
            get: function() {}
        }
    };
    var audit = {
        saveDoc: function() {}
    };
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
    sinon.stub(audit, 'saveDoc').callsArgWith(1, null);
    transition.onMatch({
        doc: {
            contact: {
                parent: {
                    _id: '1'
                }
            }
        }
    }, db, audit, function() {
        var call;

        test.equals(db.medic.get.callCount, 1);

        call = db.medic.get.getCall(0);
        test.equals(call.args[0], '1');

        test.done();
    });
};

exports['calls audit.saveDoc with clinic and updated sent_forms'] = function(test) {
    var now = moment();
    var db = {
        medic: {
            get: function() {}
        }
    };
    var audit = {
        saveDoc: function() {}
    };
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
    var save = sinon.stub(audit, 'saveDoc').callsArgWith(1, null);
    transition.onMatch({
        doc: {
            form: 'XXX',
            reported_date: now.valueOf()
        }
    }, db, audit, function() {
        var call = save.getCall(0),
            clinic = call.args[0];
        test.ok(clinic.sent_forms);
        test.ok(clinic.sent_forms.XXX);
        test.equals(clinic.sent_forms.XXX, now.toISOString());
        test.done();
    });
};

exports['does not overwrite if existing date is after'] = function(test) {
    test.expect(1);
    var now = moment(),
        tomorrow = now.clone().add(1, 'day');
    var db = {
        medic: {
            get: function() {}
        }
    };
    var audit = {
        saveDoc: function() {}
    };
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {
        sent_forms: {
            XXX: tomorrow.toISOString()
        }
    });
    transition.onMatch({
        doc: {
            form: 'XXX',
            reported_date: now.valueOf()
        }
    }, db, audit, function(err, changed) {
        test.ok(!changed);
        test.done();
    });
};

exports['overwrites if existing date is before'] = function(test) {
    test.expect(3);
    var now = moment(),
        yesterday = now.clone().subtract(1, 'day');
    var db = {
        medic: {
            get: function() {}
        }
    };
    var audit = {
        saveDoc: function() {}
    };
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {
        sent_forms: {
            XXX: yesterday.toISOString()
        }
    });
    var save = sinon.stub(audit, 'saveDoc').callsArgWith(1, null);

    transition.onMatch({
        doc: {
            form: 'XXX',
            reported_date: now.valueOf()
        }
    }, db, audit, function() {
        var call = save.getCall(0),
            clinic = call.args[0];
        test.ok(clinic.sent_forms);
        test.ok(clinic.sent_forms.XXX);
        test.equals(clinic.sent_forms.XXX, now.toISOString());
        test.done();
    });
};
