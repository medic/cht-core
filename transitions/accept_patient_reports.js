var _ = require('underscore'),
    async = require('async'),
    config = require('../config'),
    messages = require('../lib/messages'),
    moment = require('moment'),
    validation = require('../lib/validation'),
    utils = require('../lib/utils'),
    transitionUtils = require('./utils'),
    date = require('../date');

module.exports = {
    filter: function(doc) {
        var self = module.exports;
        return Boolean(
            doc &&
            doc.form &&
            doc.reported_date &&
            !self._hasRun(doc) &&
            self._hasConfig(doc) &&
            utils.getClinicPhone(doc)
        );
    },
    _hasConfig: function(doc) {
        var self = module.exports;
        return Boolean(_.findWhere(self.getAcceptedReports(), {
            form: doc.form
        }));
    },
    _hasRun: function(doc) {
        return Boolean(
            doc &&
            doc.transitions &&
            doc.transitions.accept_patient_reports
        );
    },
    getAcceptedReports: function() {
        return config.get('patient_reports') || [];
    },
    silenceRegistration: function(options, registration, callback) {
        if (options.doc._id === registration.id) {
            // don't silence the registration you're processing
            return callback();
        }
        module.exports.silenceReminders({
            db: options.db,
            audit: options.audit,
            reported_date: options.doc.reported_date,
            registration: registration,
            silence_for: options.report.silence_for,
            type: options.report.silence_type
        }, callback);
    },
    silenceRegistrations: function(options, callback) {
        if (!options.report.silence_type) {
            return callback(null, true);
        }
        async.forEach(
            options.registrations,
            function(registration, callback) {
                module.exports.silenceRegistration(options, registration, callback);
            },
            function(err) {
                callback(err, true);
            }
        );
    },
    /* try to match a recipient return undefined otherwise */
    matchRegistrations: function(options, callback) {
        var registrations = options.registrations,
            doc = options.doc,
            locale = utils.getLocale(doc),
            report = options.report;

        if (registrations && registrations.length) {
            _.each(report.messages, function(msg) {
                if (msg.event_type === 'report_accepted') {
                    messages.addMessage({
                        doc: doc,
                        message: messages.getMessage(msg.message, locale),
                        phone: messages.getRecipientPhone(doc, msg.recipient),
                        registrations: registrations
                    });
                }
            });
            return module.exports.silenceRegistrations({
                db: options.db,
                audit: options.audit,
                report: report,
                doc: doc,
                registrations: registrations
            }, callback);
        }

        transitionUtils.addRegistrationNotFoundMessage(doc, report);
        callback(null, true);
    },
    // find the messages to clear
    findToClear: function(options) {
        var registration = options.registration.doc,
            reported_date = moment(options.reported_date),
            types = _.map(options.type.split(','), function(s) {
                return s.trim();
            }),
            silence_until,
            first;

        if (options.silence_for) {
            silence_until = reported_date.clone();
            silence_until.add(date.getDuration(options.silence_for));
        }

        return _.filter(utils.filterScheduledMessages(registration, types), function(msg) {
            var due = moment(msg.due),
                matches;

            // If we have a silence_until value then clear the entire group
            // matched within the silence window. Otherwise clear all messages
            // in the future.
            if (silence_until) {
                matches = (
                    due >= reported_date &&
                    due <= silence_until &&
                    msg.state === 'scheduled'
                );
                // capture first match for group matching
                if (matches && !first) {
                    first = msg;
                }
                // clear entire group
                return (first && first.group === msg.group);
            } else {
                return (
                    due >= reported_date &&
                    msg.state === 'scheduled'
                );
            }
        });
    },
    silenceReminders: function(options, callback) {
        // filter scheduled message by group
        var toClear = module.exports.findToClear(options);
        if (!toClear.length) {
            return callback();
        }
        toClear.forEach(function(task) {
            if (task.state === 'scheduled') {
                utils.setTaskState(task, 'cleared');
            }
        });
        options.audit.saveDoc(options.registration.doc, callback);
    },
    validate: function(config, doc, callback) {
        var validations = config.validations && config.validations.list;
        return validation.validate(doc, validations, callback);
    },
    handleReport: function(options, callback) {
        var db = options.db,
            doc = options.doc;

        utils.getRegistrations({
            db: db,
            id: doc.fields && doc.fields.patient_id
        }, function(err, registrations) {
            module.exports.matchRegistrations({
                db: db,
                audit: options.audit,
                doc: doc,
                registrations: registrations,
                report: options.report
            }, callback);
        });
    },
    onMatch: function(change, _db, _audit, callback) {
        var doc = change.doc,
            reports = module.exports.getAcceptedReports(),
            report;

        report = _.findWhere(reports, {
            form: doc.form
        });

        if (!report) {
            return callback();
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
                        }
                    });
                    messages.addReply(doc, msgs.join('  '));
                } else {
                    messages.addReply(doc, _.first(errors).message || _.first(errors));
                }
                return callback(null, true);
            }

            utils.getPatientContactUuid(_db, doc.fields.patient_id, function(err) {
                if (err) {
                    if (err.statusCode === 404) {
                        transitionUtils.addRegistrationNotFoundMessage(doc, report);
                        return callback(null, true);
                    }

                    return callback(err);
                }

                module.exports.handleReport({
                    db: _db,
                    audit: _audit,
                    doc: doc,
                    report: report
                }, callback);
            });
        });
    }
};
