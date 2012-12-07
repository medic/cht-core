var _ = require('underscore'),
    fakedb = require('../fake-db'),
    transition = require('../../transitions/update_clinics'),
    phone = '+34567890123';

exports.setUp = function(callback) {
    transition.db = fakedb;
    callback();
}

exports['should update clinic by phone'] = function(test) {
    var doc = {
        from: phone,
        related_entities: {
            clinic: null
        }
    };
    transition.onMatch({
        doc: doc
    }, function(err, complete) {
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
    }, function(err, complete) {
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
    }, function(err, complete) {
        test.ok(complete);
        test.ok(doc.related_entities.clinic);
        test.equal(doc.related_entities.clinic.contact.phone, '+12345');
        test.done();
    });
};


