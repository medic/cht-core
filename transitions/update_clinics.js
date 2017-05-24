var _ = require('underscore'),
    logger = require('../lib/logger');

var associateContact = function(audit, doc, contact, callback) {
    var self = module.exports;

    // reporting phone stayed the same and contact data is up to date
    if (doc.from === contact.phone &&
        doc.contact &&
        contact._id === doc.contact._id) {
        return callback();
    }

    if (contact.phone !== doc.from) {
        contact.phone = doc.from;
        audit.saveDoc(contact, function(err) {
            if (err) {
                logger.error('Error updating contact: ' + JSON.stringify(err, null, 2));
                return callback(err);
            }
            self.setContact(doc, contact, callback);
        });
    } else {
        self.setContact(doc, contact, callback);
    }
};

var getContact = function(db, doc, callback) {
    if (doc.refid) { // use reference id to find clinic if defined
        let params = {
            key: String(doc.refid),
            include_docs: true,
            limit: 1
        };
        db.medic.view('medic', 'contacts_by_refid', params, function(err, data) {
            if (err) {
                return callback(err);
            }
            if (!data.rows.length) {
                return callback();
            }
            var result = data.rows[0].doc;
            if (result.type === 'person') {
                return callback(null, result);
            }
            if (result.type === 'clinic') {
                var id = result.contact && result.contact._id;
                if (!id) {
                    return callback(null, result.contact || { parent: result });
                }
                return db.medic.get(id, callback);
            }
            callback();
        });
    } else if (doc.from) {
        let params = {
            key: String(doc.from),
            include_docs: true,
            limit: 1
        };
        db.medic.view('medic-client', 'contacts_by_phone', params, function(err, data) {
            if (err) {
                return callback(err);
            }
            callback(null, data.rows.length && data.rows[0].doc);
        });
    } else {
        callback();
    }
};

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
        var self = module.exports;
        return Boolean(
            doc &&
            doc.type === 'data_record' &&
            !doc.contact &&
            !self._hasRun(doc)
        );
    },
    _hasRun: function(doc) {
        return Boolean(
            doc &&
            doc.transitions &&
            doc.transitions.update_clinics
        );
    },
    onMatch: function(change, db, audit, callback) {
        getContact(db, change.doc, function(err, contact) {
            if (err) {
                return callback(err);
            }
            if (!contact) {
                return callback();
            }
            associateContact(audit, change.doc, contact, callback);
        });
    },
    setContact: function(doc, contact, callback) {
        doc.contact = contact;
        // remove facility not found errors
        doc.errors = _.reject(doc.errors, function(error) {
            return error.code === 'sys.facility_not_found';
        });
        callback(null, true);
    }
};
