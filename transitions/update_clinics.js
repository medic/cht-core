var _ = require('underscore');

/**
 * Update clinic data on new data records, use refid for clinic lookup otherwise
 * phone number.
 *
 * Also update phone number on clinic data when phone number is different. We
 * try to keep the phone number updated so when we setup reminders we have a
 * good place to get phone numbers from.
 */
module.exports = {
    filter: function(doc) {
        return Boolean(
            doc.related_entities && !doc.related_entities.clinic
        );
    },
    onMatch: function(change, db, audit, callback) {
        var self = module.exports,
            doc = change.doc,
            q = {
                include_docs: true,
                limit: 1
            },
            view;

        if (doc.refid) { // use reference id to find clinic if defined
            q.key = [ doc.refid ];
            view = 'clinic_by_refid';
        } else if (doc.from) {
            q.key = [ doc.from ];
            view = 'clinic_by_phone';
        } else {
            return callback(null, false);
        }

        db.view('kujua-sentinel', view, q, function(err, data) {
            var clinic,
                existing,
                row;

            if (err) {
                return callback(err);
            }

            row = _.first(data.rows);
            clinic = row && row.doc;
            existing = doc.related_entities.clinic || {};

            if (!clinic) {
                return callback(null, false);
            }

            // reporting phone stayed the same and clinic data is up to date
            if (doc.from === clinic.contact.phone && clinic._id === existing._id && clinic._rev === existing._rev) {
                return callback(null, false);
            }

            if (clinic.contact.phone !== doc.from) {
                clinic.contact.phone = doc.from;
                db.saveDoc(clinic, function(err, ok) {
                    if (err) {
                        console.log("Error updating clinic: " + JSON.stringify(err, null, 2));
                        return callback(err);
                    }
                    self.setClinic(doc, clinic, callback);
                });
            } else {
                self.setClinic(doc, clinic, callback);
            }
        });
    },
    setClinic: function(doc, clinic, callback) {
        doc.related_entities.clinic = clinic;

        // remove facility not found errors
        doc.errors = _.reject(doc.errors, function(error) {
            return error.code === 'sys.facility_not_found';
        });
        callback(null, true);
    }
}
