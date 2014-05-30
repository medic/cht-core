var _ = require('underscore'),
    sinon = require('sinon'),
    transition = require('../../transitions/update_notifications'),
    utils = require('../../lib/utils');

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

exports['filter tests'] = function(test) {
    test.equals(transition.filter({}), false);
    test.equals(transition.filter({
        patient_id: 'x',
    }), false);
    test.equals(transition.filter({
        form: 'x',
        patient_id: 'x',
    }), false);
    test.equals(transition.filter({
        form: 'x',
        patient_id: 'x',
        related_entities: {clinic: {contact: {phone: 'x'}}}
    }), true);
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
        transition.getConfig.restore();
        test.done();
    });
}
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

        transition.getConfig.restore();

        test.done();
    });
};
exports['registration not found adds error'] = function(test) {
    var doc = {
        form: 'on',
        patient_id: 'x',
        related_entities: {clinic: {contact: {phone: 'x'}}}
    };

    sinon.stub(transition, 'getConfig').returns({
        messages: [{
            event_type: 'patient_not_found',
            message: 'not found {{patient_id}}'
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

        transition.getConfig.restore();
        utils.getRegistrations.restore();

        test.done();
    });
}
