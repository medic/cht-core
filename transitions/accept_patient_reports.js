var _ = require('underscore'),
    async = require('async'),
    config = require('../config'),
    messages = require('../lib/messages'),
    moment = require('moment'),
    validation = require('../lib/validation'),
    utils = require('../lib/utils'),
    date = require('../date'),
    db;

module.exports = {
    filter: function(doc) {
        function hasConfig(doc) {
            var reports = module.exports.getAcceptedReports();
            report = _.findWhere(reports, {
                form: doc.form
            });
            return Boolean(report);
        }
        return Boolean(
            doc.form &&
            doc.reported_date &&
            hasConfig(doc) &&
            utils.getClinicPhone(doc)
        );
    },
    getAcceptedReports: function() {
        return config.get('patient_reports') || [];
    },
    silenceRegistrations: function(options, callback) {
        var doc = options.doc,
            report = options.report,
            registrations = options.registrations;

        if (report.silence_type) {
            async.forEach(registrations, function(registration, callback) {
                module.exports.silenceReminders({
                    db: options.db || db,
                    reported_date: options.reported_date,
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
    },
    /* try to match a recipient return undefined otherwise */
    matchRegistrations: function(options, callback) {
        var registrations = options.registrations,
            doc = options.doc,
            report = options.report;

        if (registrations && registrations.length) {
            _.each(report.messages, function(msg) {
                if (msg.event_type === 'report_accepted') {
                    messages.addMessage({
                        doc: doc,
                        message: msg.message,
                        phone: messages.getRecipientPhone(doc, msg.recipient)
                    });
                }
            });
            return module.exports.silenceRegistrations({
                db: options.db || db,
                report: report,
                reported_date: doc.reported_date,
                registrations: registrations
            }, callback);
        }

        var not_found_msg,
            default_msg = {
                doc: doc,
                message: 'sys.registration_not_found',
                phone: messages.getRecipientPhone(doc, 'from')
            };
        _.each(report.messages, function(msg) {
            if (msg.event_type === 'registration_not_found') {
                not_found_msg = {
                    doc: doc,
                    message: msg.message,
                    phone: messages.getRecipientPhone(doc, msg.recipient)
                };
            }
        });
        if (not_found_msg) {
            messages.addMessage(not_found_msg);
            messages.addError(not_found_msg.doc, not_found_msg.message);
        } else {
            messages.addMessage(default_msg);
            messages.addError(default_msg.doc, default_msg.message);
        }
        callback(null, true);
    },
    // find the messages to clear
    findToClear: function(options) {
        var registration = options.registration.doc,
            silenceDuration = date.getDuration(options.silence_for),
            reportedDate = moment(options.reported_date),
            type = options.type,
            first,
            found_group,
            db = options.db || db,
            silenceUntil = reportedDate.clone();

        if (silenceDuration) {
            silenceUntil.add(silenceDuration);
        }

        return _.filter(utils.filterScheduledMessages(registration, type), function(msg) {
            var due = moment(msg.due),
                // due is after it was reported, but before the silence cutoff; also 'scheduled'
                matches = due >= reportedDate && due <= silenceUntil && msg.state === 'scheduled';

            // capture first match for group matching
            if (matches && !first) {
                first = msg;
            }
            // if groups match,always clear
            if (first && first.group === msg.group) {
                found_group = true;
                return true;
            // otherwise only if time/state matches
            } else if (!found_group) {
                return matches;
            }
        });
    },
    silenceReminders: function(options, callback) {
        var registration = options.registration.doc,
            toClear,
            db = options.db || db;

        // filter scheduled message by group
        toClear = module.exports.findToClear(options);

        // captured all to clear; now "clear" them
        _.each(toClear, function(msg) {
            if (msg.state === 'scheduled') {
                msg.state = 'cleared';
            }
        });

        if (toClear.length) {
            db.saveDoc(registration, callback);
        } else {
            callback(null);
        }
    },
    validate: function(config, doc, callback) {
        var validations = config.validations && config.validations.list;
        return validation.validate(doc, validations, callback);
    },
    handleReport: function(options, callback) {
        var db = options.db || db,
            doc = options.doc,
            report = options.report;

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

        module.exports.validate(report, doc, function(errors) {

            if (errors && errors.length > 0) {
                messages.addErrors(doc, errors);
                if (report.validations.join_responses) {
                    var msgs = [];
                    _.each(errors, function(err) {
                        if (err.message) {
                            msgs.push(err.message);
                        } else if (err) {
                            msgs.push(err);
                        };
                    });
                    messages.addReply(doc, msgs.join('  '));
                } else {
                    messages.addReply(doc, _.first(errors).message || _.first(errors));
                }
                return callback(null, true);
            }

            module.exports.handleReport({
                db: db,
                doc: doc,
                report: report
            }, callback);
        });
    }
};
