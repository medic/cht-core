var _ = require('underscore'),
    sinon = require('sinon'),
    transition = require('../../transitions/accept_patient_reports'),
    utils = require('../../lib/utils');

exports['signature'] = function(test) {
    test.ok(_.isFunction(transition.onMatch));
    test.equals(transition.onMatch.length, 3);

    test.ok(_.isFunction(transition.filter));
    test.equals(transition.filter.length, 1);
    test.done();
}

exports['filter validation'] = function(test) {
    test.equals(transition.filter({}), false);
    test.equals(transition.filter({
        form: 'x',
        related_entities: {
            clinic: {}
        }
    }), false);
    test.done();
}

exports['onMatch returns false if form not included'] = function(test) {
    sinon.stub(transition, 'getAcceptedReports').returns([ { form: 'x' }, { form: 'z' } ]);

    transition.onMatch({
        doc: {
            form: 'y'
        }
    }, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, false);

        transition.getAcceptedReports.restore();

        test.done();
    });
}

exports['onMatch with matching form calls getRegistration'] = function(test) {
    sinon.stub(transition, 'getAcceptedReports').returns([ { form: 'x' }, { form: 'z' } ]);

    var getRegistrations = sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);

    transition.onMatch({
        doc: {
            form: 'x'
        }
    }, {}, function(err, complete) {
        test.equals(complete, true);

        test.equals(getRegistrations.called, true);
        transition.getAcceptedReports.restore();
        getRegistrations.restore();

        test.done();
    });

};
