var _ = require('underscore'),
    utils = require('../lib/utils');

module.exports = {
    filter: function(doc) {
        return doc.from && doc.type === 'data_record' && doc.sent_by === undefined;
    },
    onMatch: function(change, db, audit, callback) {
        var doc = change.doc;

        db.view('kujua-sentinel', 'clinic_by_phone', {
            key: [ doc.from ]
        }, function(err, result) {
            var clinic,
                sent_by;

            if (err) {
                callback(err);
            } else {
                clinic = _.result(_.first(result.rows), 'doc'); // _.result handles falsey first row
                sent_by = utils.getClinicContactName(clinic, true) || utils.getClinicName(clinic, true);

                if (sent_by != null) {
                    doc.sent_by = sent_by;
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            }
        });
    },
    repeatable: true
};
