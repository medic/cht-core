var async = require('async'),
    config = require('../config'),
    utils = require('../lib/utils'),
    _ = require('underscore'),
    messages = require('../lib/messages'),
    validation = require('../lib/validation');

module.exports = {
    filter: function(doc) {
        return Boolean(
            doc.form &&
            doc.patient_id &&
            utils.getClinicPhone(doc)
        );
    },
    getConfig: function() {
        return _.extend({}, config.get('notifications'));
    },
    modifyRegistration: function(options, callback) {
        var mute = options.mute,
            registration = options.registration,
            db = options.db;

        if (mute) {
            utils.muteScheduledMessages(registration);
        } else {
            utils.unmuteScheduledMessages(registration);
        }
        db.saveDoc(registration, callback);
    },
    validate: function(config, doc, callback) {
        var validations = config.validations && config.validations.list;
        return validation.validate(doc, validations, callback);
    },
    onMatch: function(change, db, audit, callback) {
        var doc = change.doc,
            patient_id = doc.patient_id,
            config = module.exports.getConfig(),
            locale = utils.getLocale(doc),
            mute;

        if (!config.on_form && !config.off_form) {
            // not configured; bail
            return callback(null, false);
        } else if (utils.isFormCodeSame(config.on_form, doc.form)) {
            mute = false;
        } else if (utils.isFormCodeSame(config.off_form, doc.form)) {
            mute = true;
        } else {
            // transition does not apply; return false
            return callback(null, false);
        }

        module.exports.validate(config, doc, function(errors) {

            if (errors && errors.length > 0) {
                messages.addErrors(doc, errors);
                if (config.validations.join_responses) {
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

            utils.getRegistrations({
                db: db,
                id: patient_id
            }, function(err, registrations) {

                function addErr(event_type) {
                    var msg = _.findWhere(config.messages, {
                        event_type: event_type
                    }).message;
                    if (msg) {
                        messages.addError(doc, messages.getMessage(msg, locale));
                    } else {
                        messages.addError(doc, event_type);
                    }
                }

                function addMsg(event_type) {
                    var msg = _.findWhere(config.messages, {
                        event_type: event_type
                    }).message;
                    messages.addMessage({
                        doc: doc,
                        message: messages.getMessage(msg, locale),
                        phone: messages.getRecipientPhone(doc, msg.recipient)
                    });
                };

                if (err) {
                    callback(err);
                } else if (registrations.length) {
                    if (mute) {
                        if (config.confirm_deactivation) {
                            addErr('confirm_deactivation');
                            return callback(null, true);
                        } else {
                            addMsg('on_mute');
                        }
                    } else {
                            addMsg('on_unmute');
                    }
                    async.each(registrations, function(registration, callback) {
                        module.exports.modifyRegistration({
                            db: audit,
                            mute: mute,
                            registration: registration.doc
                        }, callback);
                    }, function(err) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, true);
                        }
                    });
                } else {
                    addErr('patient_not_found');
                    addMsg('patient_not_found');
                    callback(null, true);
                }
            });
        });
    }
};
