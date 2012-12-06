var _ = require('underscore'),
    transition = require('../../transitions/update_clinics'),
    db = require('../../db'),
    phone = '+34567890123';

exports.tearDown = function(callback) {
    db.view('kujua-sentinel', 'clinic_by_refid', {
        include_docs: true,
        limit: 1,
        key: [ '1000' ]
    }, function(err, result) {
        var row = _.first(result.rows),
            clinic = row && row.doc;

        if (clinic) {
            clinic.contact.phone = phone;
            db.saveDoc(clinic, callback);
        } else {
            callback();
        }
    });
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


