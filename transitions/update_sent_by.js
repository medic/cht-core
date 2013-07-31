var _ = require('underscore'),
    utils = require('../lib/utils');

module.exports = {
    onMatch: function(change, db, callback) {
        var doc = change.doc;

        db.view('kujua-sentinel', 'clinic_by_phone', {
            key: [ doc.from ]
        }, function(err, result) {
            var clinic;

            if (err) {
                callback(err);
            } else {
                clinic = _.result(_.first(result.rows), 'doc'); // _.result handles falsey first row
                doc.sent_by = utils.getClinicContactName(clinic, true) || utils.getClinicName(clinic, true);
                callback(null, true);
            }
        });
    }
};
