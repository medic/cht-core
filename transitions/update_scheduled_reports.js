var _ = require('underscore'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger');

module.exports = {
    filter: function(doc) {
        var self = module.exports;
        return Boolean(
            doc &&
            doc.form &&
            utils.getClinicPhone(doc) &&
            (doc.errors ? doc.errors.length === 0 : true) &&
            self._isFormScheduled(doc)
        );
    },
    /**
     * If a record has a month/week/week_number, year and clinic then look for
     * duplicates and update those instead.
     *
     * POST from smssync creates doc
     * GET  /scheduled_reports/:form/:year/:week|month/:clinic_id (look for dups)
     *
     */
    onMatch: function(change, db, audit, callback) {
        var self = module.exports;
        self._getDuplicates(db, change.doc, function(err, rows) {

            // only one record in duplicates, mark transition complete
            if (rows && rows.length === 1) {
                return callback(null, true);
            }

            // remove duplicates and replace with latest doc
            var found_target,
                docs = [];

            _.each(rows, function(row) {
                var doc = row.doc;
                if (doc._id === change.doc._id) {
                    doc._deleted = true;
                } else if (!found_target) {
                    var id = doc._id,
                        rev = doc._rev;
                    found_target = true;
                    // overwrite data except _rev and _id fields
                    doc = change.doc;
                    doc._id = id;
                    doc._rev = rev;
                } else {
                    doc._deleted = true;
                }
                docs.push(doc);
            });

            audit.bulkSave(docs, {
                all_or_nothing: true,
                docs: docs
            }, function(err) {
                // cancels transition and marks as incomplete
                if (err) {
                    logger.error('error doing bulk save', err);
                    return callback(null, false);
                }
                callback(null, true);
            });
        });

    },
    //
    // look for duplicate from same year, month/week and reporting unit
    // also includes changed doc
    //
    _getDuplicates: function(db, doc, callback) {
        var q = { include_docs: true },
            view,
            clinic_id = utils.getClinicID(doc);

        if (doc.fields.week || doc.fields.week_number) {
            q.startkey = [doc.form, doc.fields.year, doc.fields.week || doc.fields.week_number, clinic_id];
            q.endkey = [doc.form, doc.fields.year, doc.fields.week || doc.fields.week_number, clinic_id, {}];
            view = 'data_records_by_form_year_week_clinic_id_and_reported_date';
        } else if (doc.fields.month || doc.fields.month_num) {
            q.startkey = [doc.form, doc.fields.year, doc.fields.month || doc.fields.month_num, clinic_id];
            q.endkey = [doc.form, doc.fields.year, doc.fields.month || doc.fields.month_num, clinic_id, {}];
            view = 'data_records_by_form_year_month_clinic_id_and_reported_date';
        } else {
            return callback();
        }

        db.medic.view('kujua-sentinel', view, q, function(err, data) {
            callback(err, data && data.rows);
        });
    },
    _isFormScheduled: function(doc) {
        return doc.fields && (
            doc.fields.month ||
            doc.fields.month_num ||
            doc.fields.week ||
            doc.fields.week_number
        ) && doc.fields.year;
    }
};
