var _ = require('underscore'),
    utils = require('../lib/utils'),
    new_doc;

/**
 * If a record has a month/week/week_number, year and clinic then look for
 * duplicates and update those instead.
 *
 * POST from smssync creates doc
 * GET  /scheduled_reports/:form/:year/:week|month/:clinic_id (look for dups)
 *
 */
var handleMatch = function(change, db, audit, callback) {
    var self = module.exports;

    new_doc = change.doc;

    getDuplicates(db, function(err, rows) {

        // only one record in duplicates, mark transition complete
        if (rows && rows.length === 1) {
            return callback(null, true);
        }

        // remove duplicates and replace latest with new_doc
        var found_target,
            docs = [];

        _.each(rows, function(row) {
            var doc = row.doc;
            if (doc._id === new_doc._id) {
                doc._deleted = true;
            } else if (!found_target) {
                var id = doc._id,
                    rev = doc._rev;
                found_target = true;
                // overwrite data except _rev and _id fields
                doc = new_doc;
                doc._id = id;
                doc._rev = rev;
            } else {
                doc._deleted = true;
            }
            docs.push(doc);
        });

        audit.bulkSave({
            all_or_nothing: true,
            docs: docs
        }, function(err) {
            // cancels transition and marks as incomplete
            if (err) {
                console.error('error doing bulk save', err);
                return callback(null, false);
            }
            callback(null, true);
        });
    });

};

//
// look for duplicate from same year, month/week and reporting unit
// also includes new_doc
//
var getDuplicates = function(db, callback) {

    var doc = new_doc,
        q = { include_docs: true },
        view,
        clinic_id = utils.getClinicID(doc),
        self = module.exports;

    if (doc.week || doc.week_number) {
        q.startkey = [doc.form, doc.year, doc.week || doc.week_number, clinic_id];
        q.endkey = [doc.form, doc.year, doc.week || doc.week_number, clinic_id, {}];
        view = 'data_records_by_form_year_week_clinic_id_and_reported_date';
    } else if (doc.month) {
        q.startkey = [doc.form, doc.year, doc.month, clinic_id];
        q.endkey = [doc.form, doc.year, doc.month, clinic_id, {}];
        view = 'data_records_by_form_year_month_clinic_id_and_reported_date';
    } else {
        return callback();
    }

    db.view('kujua-sentinel', view, q, function(err, data) {
        callback(err, data && data.rows);
    });
};

module.exports = {
    filter: function(doc) {
        return Boolean(
            doc.form &&
            utils.getClinicPhone(doc) &&
            doc.errors.length === 0 &&
            (doc.month || doc.month_num || doc.week || doc.week_number) &&
            doc.year
        );
    },
    onMatch: handleMatch
};
