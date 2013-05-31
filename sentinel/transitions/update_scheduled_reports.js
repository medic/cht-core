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


        // skip transition
        if (!clinic_id || !doc.year || !doc.form)
            return;

        if (doc.week || doc.week_number) {
            q.startkey = [doc.form, doc.year, doc.week || doc.week_number, clinic_id];
            q.endkey = [doc.form, doc.year, doc.week || doc.week_number, clinic_id, {}];
            view = 'data_records_by_form_year_week_and_clinic_id';
        } else if (doc.month) {
            q.startkey = [doc.form, doc.year, doc.month, clinic_id];
            q.endkey = [doc.form, doc.year, doc.month, clinic_id, {}];
            view = 'data_records_by_form_year_month_and_clinic_id';
        } else {
            return;
        }

        console.log('check for duplicate')
        self.db.view('kujua-sentinel', view, q, function(err, data) {

            console.log('data',data);
            var existing = _.first(data.rows),
                delete_doc = {id: doc._id, rev: doc._rev, _deleted: true},
                q = {all_or_nothing: true};

            if (err) return callback(err);

            if (!existing) return callback();

            console.log('found existing',existing);
            // prepare new version
            doc._rev = existing._rev;
            doc._id = existing._id;

            self.db.bulkDocs({docs: [doc, delete_doc]}, q, function(err, data) {
                console.log('bulkdocs callback args',arguments);
                if (err)
                    return callback(err);
                var errors = [];
                _.each(data, function(val) {
                    if (!val.rev)
                        errors.push(val);
                });
                callback(errors, true);
            });

        });
    }
}
