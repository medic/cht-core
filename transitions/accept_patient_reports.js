var _ = require('underscore'),
    async = require('async'),
    config = require('../config'),
    messages = require('../lib/messages'),
    moment = require('moment'),
    utils = require('../lib/utils'),
    date = require('../date'),
    db = require('../db');

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
                    db = options.db || db;
                    module.exports.silenceReminders({
                        db: db,
                        reported_date: doc.reported_date,
                        registration: registration.doc,
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
        var registration = options.registration,
            type = options.type,
            toClear,
            silenceDuration = date.getDuration(options.silence_for),
            reportedDate = moment(options.reported_date),
            silenceUntil = reportedDate.clone(),
            first;

        db = options.db || db;

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
    handleReport: function(options, callback) {
        var doc = options.doc,
            report = options.report;

        db = options.db || db;

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
    },
    onMatch: function(change, _db, callback) {
        var doc = change.doc,
            reports = module.exports.getAcceptedReports(),
            report;

        db = _db;

        report = _.findWhere(reports, {
            form: doc.form
        });

        if (!report) {
            return callback(null, false);
        }

        var errors = utils.validatePatientId(doc.patient_id, function(id) {
            if (!new RegExp(report.patient_id_validation_regexp).test(id)) {
                return report.invalid_patient_id;
            }
        });

        if (errors.length) {
            _.each(errors, function(e) { messages.addError(doc, e); });
            return callback(null, true);
        }

        module.exports.handleReport({
            db: db,
            doc: doc,
            report: report
        }, callback);
    }
};
