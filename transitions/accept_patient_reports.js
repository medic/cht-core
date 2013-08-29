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
    validatePatientId: function(report, doc) {
        _.defaults(report, {
            invalid_patient_id: "Patient ID '{{patient_id}}' is invalid. Please correct this and try again."
        });

        if (report.patient_id_validation_regexp) {
            return new RegExp(report.patient_id_validation_regexp).test(doc.patient_id);
        } else {
            return true;
        }
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            reports = module.exports.getAcceptedReports(),
            report;

        report = _.findWhere(reports, {
            form: doc.form
        });

        if (report) {
            if (module.exports.validatePatientId(report, doc)) {
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
                messages.addError(doc, report.invalid_patient_id);
                callback(null, true);
            }
        } else {
            callback(null, false);
        }
    }
};
