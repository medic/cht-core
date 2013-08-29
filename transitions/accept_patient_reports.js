var _ = require('underscore'),
    config = require('../config'),
    messages = require('../lib/messages'),
    utils = require('../lib/utils');

module.exports = {
    filter: function(doc) {
        return !!(doc.form && doc.patient_id && doc.related_entities && doc.related_entities.clinic);
    },
    getAcceptedReports: function() {
        return config.get('patient_reports') || [];
    },
    matchRegistrations: function(options, callback) {
        var registrations = options.registrations,
            doc = options.doc,
            report = options.report;

        if (registrations.length) {
            messages.addReply(doc, report.report_accepted);
        } else {
            messages.addError(doc, report.registration_not_found);
        }
        callback(null, true);
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
                module.exports.matchRegistrations({
                    doc: doc,
                    registrations: registrations,
                    report: report
                }, callback);
            });
        } else {
            callback(null, false);
        }
    }
};
