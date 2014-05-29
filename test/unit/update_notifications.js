var _ = require('underscore'),
    sinon = require('sinon'),
    transition = require('../../transitions/update_notifications'),
    utils = require('../../lib/utils');

var restore = function(objs) {
    _.each(objs, function(obj) {
        if (obj.restore) obj.restore();
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

exports['filter tests: empty doc does not match'] = function(test) {
    test.ok(!transition.filter({}));
    test.done();
};

exports['filter tests: missing form does not match'] = function(test) {
    test.ok(!transition.filter({
        patient_id: 'x',
    }));
    test.done();
};

exports['filter tests: missing clinic phone does not match'] = function(test) {
    sinon.stub(utils, 'getClinicPhone').returns(null);
    test.ok(!transition.filter({
        form: 'x',
        patient_id: 'x'
    }));
    test.done();
};

exports['filter tests: match'] = function(test) {
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

exports['registration not found adds error'] = function(test) {
    var doc = {
        form: 'on',
        patient_id: 'x'
    };

    sinon.stub(transition, 'getConfig').returns({
        patient_not_found: 'not found {{patient_id}}',
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
        test.done();
    });
};
