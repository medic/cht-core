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
var handleMatch = function(change, callback) {

    new_doc = change.doc;
    var self = module.exports;

    // only process record after callbacks with gateway are done, do nothing
    // otherwise. hackish for now since validation and responses are still
    // processed in couchapp with callbacks.
    if (new_doc.responses && new_doc.responses.length === 0) {
        // do nothing
        return callback();
    }

    getDuplicates(function(err, rows) {

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

        self.db.bulkDocs({docs:docs}, {all_or_nothing: true}, function(err) {
            // cancels transition and marks as incomplete
            if (err) {
                console.error('error doing bulk save', err);
                return callback(null, false);
            }
            // this fails with a conflict first time it runs, but transition
            // property finalizes when processing the next change
            callback(null, true);
        });
    });

};

//
// look for duplicate from same year, month/week and reporting unit
// also includes new_doc
//
var getDuplicates = function(callback) {

    var doc = new_doc,
        q = { include_docs: true },
        view,
        clinic_id = utils.getClinicID(doc),
        self = module.exports;

    if (!clinic_id || !doc.year || !doc.form)
        return callback();

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

    self.db.view('kujua-sentinel', view, q, function(err, data) {
        callback(err, data && data.rows);
    });

};

module.exports = {
    db: require('../db'),
    onMatch: handleMatch
}
