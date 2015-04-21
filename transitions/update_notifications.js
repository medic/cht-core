var async = require('async'),
    _ = require('underscore'),
    mustache = require('mustache'),
    config = require('../config'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    messages = require('../lib/messages'),
    validation = require('../lib/validation');

var getMessage = function(config, eventType) {
    var msg = _.findWhere(config.messages, { event_type: eventType });
    return msg && msg.message;
};

var getEventType = function(config, doc) {
    if (!config.on_form && !config.off_form) {
        // no configured on or off forms
        return false;
    }
    var mute;
    if (utils.isFormCodeSame(config.on_form, doc.form)) {
        mute = false;
    } else if (utils.isFormCodeSame(config.off_form, doc.form)) {
        mute = true;
    } else {
        // transition does not apply; return false
        return false;
    }
    var eventType = mute ? 'on_mute' : 'on_unmute';
    var msg = getMessage(config, eventType);
    if (!msg) {
        // no configured message for the given eventType
        return false;
    }
    return { mute: mute, type: eventType };
};

var hasRun = function(doc) {
    return Boolean(
        doc &&
        doc.transitions &&
        doc.transitions['update_notifications']
    );
};

module.exports = {
    filter: function(doc) {
        return Boolean(
            doc &&
            doc.form &&
            doc.patient_id &&
            !hasRun(doc) &&
            utils.getClinicPhone(doc)
        );
    },
    getConfig: function() {
        return _.extend({}, config.get('notifications'));
    },
    modifyRegistration: function(options, callback) {
        var mute = options.mute,
            registration = options.registration,
            audit = options.audit;

        if (mute) {
            utils.muteScheduledMessages(registration);
        } else {
            utils.unmuteScheduledMessages(registration);
        }
        audit.saveDoc(registration, callback);
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
            eventType = getEventType(config, doc);

        if (!eventType) {
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
                    var msg = getMessage(config, event_type);
                    if (msg) {
                        messages.addError(doc, messages.getMessage(msg, locale));
                    } else {
                        messages.addError(doc, event_type);
                    }
                }

                function addMsg(event_type) {
                    var msg = getMessage(config, event_type);
                    messages.addMessage({
                        doc: doc,
                        message: messages.getMessage(msg, locale),
                        phone: messages.getRecipientPhone(doc, msg.recipient),
                        registrations: registrations
                    });
                };

                if (err) {
                    callback(err);
                } else if (registrations.length) {
                    if (eventType.mute && config.confirm_deactivation) {
                        addErr('confirm_deactivation');
                        return callback(null, true);
                    }
                    addMsg(eventType.type);
                    async.each(registrations, function(registration, callback) {
                        module.exports.modifyRegistration({
                            audit: audit,
                            mute: eventType.mute,
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
