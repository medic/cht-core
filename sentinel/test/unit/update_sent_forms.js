var moment = require('moment'),
    sinon = require('sinon').sandbox.create(),
    db = require('../../db'),
    transition = require('../../transitions/update_sent_forms');

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    callback();
};

exports.tearDown = function(callback) {
  sinon.restore();
  callback();
};

exports['calls db.get with id of clinic'] = function(test) {
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
    sinon.stub(db.audit, 'saveDoc').callsArgWith(1, null);
    const change = {
        doc: {
            contact: {
                parent: {
                    _id: '1'
                }
            }
        }
    };
    transition.onMatch(change).then(() => {
        test.equals(db.medic.get.callCount, 1);
        test.equals(db.medic.get.args[0][0], '1');
        test.done();
    });
};

exports['calls audit.saveDoc with clinic and updated sent_forms'] = function(test) {
    var now = moment();
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
    var save = sinon.stub(db.audit, 'saveDoc').callsArgWith(1, null);
    const change = {
        doc: {
            form: 'XXX',
            reported_date: now.valueOf()
        }
    };
    transition.onMatch(change).then(() => {
        const clinic = save.args[0][0];
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
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {
        sent_forms: { XXX: tomorrow.toISOString() }
    });
    sinon.stub(db.audit, 'saveDoc').callsArgWith(1, null);
    const change = {
        doc: {
            form: 'XXX',
            reported_date: now.valueOf()
        }
    };
    transition.onMatch(change).then(changed => {
        test.ok(!changed);
        test.done();
    });
};

exports['overwrites if existing date is before'] = function(test) {
    test.expect(3);
    var now = moment(),
        yesterday = now.clone().subtract(1, 'day');
    sinon.stub(db.medic, 'get').callsArgWith(1, null, {
        sent_forms: { XXX: yesterday.toISOString() }
    });
    var save = sinon.stub(db.audit, 'saveDoc').callsArgWith(1, null);

    const change = {
        doc: {
            form: 'XXX',
            reported_date: now.valueOf()
        }
    };
    transition.onMatch(change).then(() => {
        const clinic = save.args[0][0];
        test.ok(clinic.sent_forms);
        test.ok(clinic.sent_forms.XXX);
        test.equals(clinic.sent_forms.XXX, now.toISOString());
        test.done();
    });
};
