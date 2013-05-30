var _ = require('underscore'),
    utils = require('../lib/utils');

/**
 * If a record has a month/week/week_number, year and clinic then look for
 * duplicates and update those instead.
 *
 * POST from smssync creates doc
 * GET  /scheduled_reports/:form/:year/:week|month/:clinic_id (look for dups)
 *
 */
module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var self = module.exports,
            doc = change.doc,
            q = {
                include_docs: true,
                limit: 1
            },
            view,
            clinic_id = utils.getClinicID(doc);


        if (!clinic_id || !doc.year || !doc.form)
            return callback(null, false);

        if (doc.week || doc.week_number) {
            q.startkey = [doc.form, doc.year, doc.week || doc.week_number, clinic_id];
            q.endkey = [doc.form, doc.year, doc.week || doc.week_number, clinic_id, {}];
            view = 'data_records_by_year_week_and_clinic_id';
        } else if (doc.month) {
            q.startkey = [doc.form, doc.year, doc.month, clinic_id];
            q.endkey = [doc.form, doc.year, doc.month, clinic_id, {}];
            view = 'data_records_by_year_month_and_clinic_id';
        } else {
            return callback(null, false);
        }

        // check for duplicate
        self.db.view('kujua-sentinel', view, q, function(err, data) {

            var existing = _.first(data.rows),
                new_doc = {id: doc._id, rev: doc._rev};

            if (err) return callback(err);

            if (!existing) return callback(null, false);

            // put rev and id on new record and insert new version
            doc._rev = existing._rev;
            doc._id = existing._id;

            self.db.saveDoc(doc, function(err, ok) {
                if (err) {
                    console.log("Error updating record: " + JSON.stringify(err, null, 2));
                    return callback(err);
                }
                // delete new doc
                self.db.removeDoc(new_doc.id, new_doc.rev, function(err, ok) {
                    if (err) callback(err);
                    callback(null, false);
                });
            });
        });
    }
}
