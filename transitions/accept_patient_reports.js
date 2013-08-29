var _ = require('underscore'),
    config = require('../config'),
    utils = require('../lib/utils');

module.exports = {
    filter: function(doc) {
        return !!(doc.form && doc.patient_id && doc.related_entities && doc.related_entities.clinic);
    },
    getAcceptedReports: function() {
        return config.get('patient_reports') || [];
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            reports = module.exports.getAcceptedReports(),
            report;

        report = _.findWhere(reports, {
            form: doc.form
        });

        if (report) {
            utils.getRegistrations({
                db: db,
                id: doc.patient_id
            }, function(err, registrations) {
                callback(null, true);
            });
        } else {
            callback(null, false);
        }
    }
};
