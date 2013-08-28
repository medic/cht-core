var _ = require('underscore'),
    transition = require('../../transitions/pregnancy_registration'),
    sinon = require('sinon'),
    moment = require('moment'),
    utils = require('../../lib/utils'),
    related_entities;

related_entities = {
    clinic: {
        contact: {
            phone: '+1234'
        }
    }
};

function getMessage(doc) {
    return _.first(_.first(doc.tasks).messages).message;
}

exports['filter fails with empty doc'] = function(test) {
    test.ok(_.isFunction(transition.filter));
    test.ok(transition.filter.length >= 1);

    test.equals(transition.filter({}), false);

    test.done();
};

exports['filter passes if form but not if form and patient_id and lmp_date'] = function(test) {
    test.equals(transition.filter({
        form: 'x'
    }), true);
    test.equals(transition.filter({
        form: 'x',
        patient_id: 'xyz'
    }), true);
    test.equals(transition.filter({
        form: 'x',
        patient_id: 'xyz',
        lmp_date: moment().toISOString()
    }), false);
    test.done();
};

exports['is repeatable'] = function(test) {
    test.equals(transition.repeatable, true);
    test.done();
};

exports['lmp > 40 or NaN returns false from validateLMP'] = function(test) {
    test.equals(transition.validateLMP({ lmp: 41 }), false);
    test.equals(transition.validateLMP({ lmp: 'x' }), false);

    test.done();
}

exports['lmp <= 40 returns true from validateLMP'] = function(test) {
    test.equals(transition.validateLMP({ lmp: 25 }), true);
    test.equals(transition.validateLMP({ lmp: 0 }), true);
    test.equals(transition.validateLMP({ lmp: 40 }), true);

    test.done();
}

exports['name validation'] = function(test) {
    test.equals(transition.validateName({
        patient_name: 'abc'
    }, {
        max_name_length: 100
    }), true);

    test.equals(transition.validateName({
        patient_name: 'abc'
    }, {
        max_name_length: 2
    }), false);

    test.equals(transition.validateName({
        patient_name: ''
    }, {
        max_name_length: 2
    }), false);

    test.equals(transition.validateName({
        patient_name: 'ab'
    }, {
        max_name_length: 2
    }), true);

    test.done();
}

exports['is id only'] = function(test) {
    test.equals(transition.isIdOnly({}), false);
    test.equals(transition.isIdOnly({
        getid: undefined
    }), false);
    test.equals(transition.isIdOnly({
        getid: ''
    }), false);
    test.equals(transition.isIdOnly({
        getid: 'x'
    }), true);
    test.done();
}

exports['setDate sets lmp_date and expected_date correctly for lmp: 0'] = function(test) {
    var doc,
        start = moment().startOf('week');

    doc = {
        lmp: 0
    };

    transition.setDate(doc);

    test.ok(doc.lmp_date);
    test.equals(doc.lmp_date, start.toISOString());
    test.equals(doc.expected_date, start.clone().add(40, 'weeks').toISOString());

    test.done();
}

exports['setDate sets lmp_date and expected_date correctly for lmp: 10'] = function(test) {
    var doc,
        start = moment().startOf('week');

    doc = {
        lmp: '10'
    };

    transition.setDate(doc);

    test.ok(doc.lmp_date);
    test.equals(doc.lmp_date, start.clone().subtract(10, 'weeks').toISOString());
    test.equals(doc.expected_date, start.clone().add(30, 'weeks').toISOString());

    test.done();
}

exports['valid adds lmp_date and patient_id'] = function(test) {
    var doc,
        start = moment().startOf('week').subtract(5, 'weeks');

    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);

    doc = {
        patient_name: 'abc',
        lmp: 5
    };

    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.lmp_date, start.toISOString());
        test.ok(doc.patient_id);

        test.equals(doc.tasks, undefined);

        utils.getRegistrations.restore();

        test.done();
    });
}

exports['id only logic with valid name'] = function(test) {
    var doc;

    sinon.stub(utils, 'getRegistrations').callsArgWithAsync(1, null, []);

    doc = {
        patient_name: 'abc',
        lmp: 5,
        getid: 'x'
    };

    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.lmp_date, undefined);
        test.ok(doc.patient_id);

        utils.getRegistrations.restore();

        test.done();
    });
}

exports['id only logic with invalid name'] = function(test) {
    var doc;

    doc = {
        patient_name: '',
        lmp: 5,
        getid: 'x'
    };

    sinon.stub(transition, 'getConfig').returns({
        include_patient_name: 'include patient name'
    });
    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.patient_id, undefined);
        test.ok(doc.tasks);

        test.equals(getMessage(doc), 'include patient name');

        transition.getConfig.restore();

        test.done();
    });
}

exports['invalid name valid LMP logic'] = function(test) {
    var doc;

    doc = {
        patient_name: '',
        lmp: 5
    };

    sinon.stub(transition, 'getConfig').returns({
        invalid_name: 'invalid name lols'
    });
    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.patient_id, undefined);
        test.equals(getMessage(doc), 'invalid name lols');

        transition.getConfig.restore();

        test.done();
    });
}

exports['valid name invalid LMP logic'] = function(test) {
    var doc;

    doc = {
        patient_name: 'hi',
        lmp: 45
    };

    sinon.stub(transition, 'getConfig').returns({
        invalid_lmp: 'Invalid LMP; must be between 0-40 weeks.'
    });
    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.patient_id, undefined);
        test.equals(getMessage(doc), 'Invalid LMP; must be between 0-40 weeks.');

        transition.getConfig.restore();

        test.done();
    });
}

exports['invalid name invalid LMP logic'] = function(test) {
    var doc;

    doc = {
        patient_name: '',
        lmp: 45
    };

    sinon.stub(transition, 'getConfig').returns({
        invalid_values: 'Please include patient name and valid LMP.'
    });
    transition.onMatch({
        doc: doc
    }, {}, function(err, complete) {
        test.equals(err, null);
        test.equals(complete, true);
        test.equals(doc.patient_id, undefined);
        test.equals(getMessage(doc), 'Please include patient name and valid LMP.');

        transition.getConfig.restore();

        test.done();
    });
}

exports['mismatched form returns false'] = function(test) {
    sinon.stub(transition, 'getConfig').returns({
        form: 'y'
    });
    transition.onMatch({
        doc: {
            form: 'x'
        }
    }, {}, function(err, complete) {
        test.equals(complete, false);

        transition.getConfig.restore();

        test.done();
    })
}
