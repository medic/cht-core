var fakedb = require('../fake-db'),
    fakeaudit = require('../fake-audit'),
    transition = require('../../transitions/update_clinics'),
    phone = '+34567890123';

exports.setUp = function(callback) {
    process.env.TEST_ENV = true;
    callback();
}

exports['filter includes docs with no clinic'] = function(test) {
    var doc = {
        from: phone,
        related_entities: {}
    };
    test.ok(transition.filter(doc));
    test.done();
};

exports['filter out docs which already have a clinic'] = function(test) {
    var doc = {
        from: phone,
        related_entities: {
            clinic: { name: 'some clinic' }
        }
    };
    test.ok(!transition.filter(doc));
    test.done();
};

exports['should update clinic by phone'] = function(test) {
    var doc = {
        from: phone,
        related_entities: {
            clinic: null
        }
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function(err, complete) {
        test.ok(complete);
        test.ok(doc.related_entities.clinic);
        test.equal(doc.related_entities.clinic.contact.phone, phone);
        test.done();
    });
};

exports['should not update clinic with wrong phone'] = function(test) {
    var doc = {
        from: 'WRONG',
        related_entities: {
            clinic: null
        }
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function(err, complete) {
        test.ok(!complete);
        test.ok(!doc.related_entities.clinic);
        test.done();
    });
};

exports['should update clinic by refid and fix number'] = function(test) {
    var doc = {
        from: '+12345',
        refid: '1000',
        related_entities: {
            clinic: null
        }
    };
    transition.onMatch({
        doc: doc
    }, fakedb, fakeaudit, function(err, complete) {
        test.ok(complete);
        test.ok(doc.related_entities.clinic);
        test.equal(doc.related_entities.clinic.contact.phone, '+12345');
        test.done();
    });
};


