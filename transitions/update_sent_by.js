var _ = require('underscore'),
    utils = require('../lib/utils');

module.exports = {
    filter: function(doc) {
        var self = module.exports;
        return Boolean(
            doc &&
            doc.from &&
            doc.type === 'data_record' &&
            doc.sent_by === undefined &&
            !self._hasRun(doc)
        );
    },
    _hasRun: function(doc) {
        return Boolean(
            doc &&
            doc.transitions &&
            doc.transitions.update_sent_by &&
            doc.transitions.update_sent_by.ok
        );
    },
    onMatch: function(change, db, audit, callback) {
        var doc = change.doc;

        db.medic.view('kujua-sentinel', 'clinic_by_phone', {
            key: [ doc.from ],
            include_docs: true
        }, function(err, result) {
            if (err) {
                return callback(err);
            }
            var clinic = _.result(_.first(result.rows), 'doc'); // _.result handles falsey first row
            var sent_by = utils.getClinicContactName(clinic, true) || utils.getClinicName(clinic, true);
            if (sent_by) {
                doc.sent_by = sent_by;
                return callback(null, true);
            }
            callback();
        });
    }
};
