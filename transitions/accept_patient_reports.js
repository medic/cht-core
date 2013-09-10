var _ = require('underscore'),
    async = require('async'),
    config = require('../config'),
    messages = require('../lib/messages'),
    moment = require('moment'),
    utils = require('../lib/utils'),
    date = require('../date');

module.exports = {
    filter: function(doc) {
        return Boolean(
            doc.form &&
            doc.patient_id &&
            doc.reported_date &&
            doc.related_entities &&
            doc.related_entities.clinic &&
            doc.related_entities.clinic.contact &&
            doc.related_entities.clinic.contact.phone
        );
    },
    getPatientRegForm: function() {
        var conf = config.get('pregnancy_registration');
        return conf && conf.form;
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
            if (report.silence_type) {
                async.forEach(registrations, function(registration, callback) {
                    module.exports.silenceReminders({
                        db: options.db,
                        reported_date: doc.reported_date,
                        registration: registration,
                        silence_for: report.silence_for,
                        type: report.silence_type
                    }, callback);
                }, function(err) {
                    callback(err, true);
                });
            } else {
                callback(null, true);
            }
        } else {
            messages.addError(doc, report.registration_not_found);
            callback(null, true);
        }
    },
    silenceReminders: function(options, callback) {
        var db = options.db,
            registration = options.registration,
            type = options.type,
            toClear,
            silenceDuration = date.getDuration(options.silence_for),
            reportedDate = moment(options.reported_date),
            silenceUntil = reportedDate.clone(),
            first;

        if (silenceDuration) {
            silenceUntil.add(silenceDuration);
        }

        // filter scheduled message by group
        toClear = _.filter(utils.filterScheduledMessages(registration, type), function(msg) {
            var due = moment(msg.due),
                // due is after it was reported, but before the silence cutoff; also 'scheduled'
                matches = due >= reportedDate && due <= silenceUntil && msg.state === 'scheduled';

            // capture first match for group matching
            if (matches && !first) {
                first = msg;
            }
            // if groups match,always clear
            if (first && first.group === msg.group) {
                return true;
            // otherwise only if time/state matches
            } else {
                return matches;
            }
        });

        // captured all to clear; now "clear" them
        _.each(toClear, function(msg) {
            msg.state = 'cleared';
        });

        if (toClear.length) {
            db.saveDoc(registration, callback);
        } else {
            callback(null);
        }
    },
    validatePatientId: function(report, doc) {

        report = report || {};

        _.defaults(report, {
            invalid_patient_id: "Patient ID '{{patient_id}}' is invalid. Please correct this and try again."
        });

        if (report.patient_id_validation_regexp) {
            return new RegExp(report.patient_id_validation_regexp).test(doc.patient_id);
        } else {
            return true;
        }
    },
    handleReport: function(options, callback) {
        var db = options.db,
            doc = options.doc,
            report = options.report,
            reg_form = options.reg_form;

        utils.getRegistrations({
            db: db,
            id: doc.patient_id,
            form: reg_form
        }, function(err, registrations) {
            module.exports.matchRegistrations({
                doc: doc,
                registrations: registrations,
                report: report
            }, callback);
        });
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            reports = module.exports.getAcceptedReports(),
            reg_form = module.exports.getPatientRegForm(),
            report;

        report = _.findWhere(reports, {
            form: doc.form
        });

        if (!module.exports.validatePatientId(report, doc)) {
            messages.addError(doc, report.invalid_patient_id);
            return callback(null, true);
        }

        if (!reg_form || !report) {
            return callback(null, false);
        }

        module.exports.handleReport({
            db: db,
            doc: doc,
            report: report,
            reg_form: reg_form
        }, callback);
    }
};
