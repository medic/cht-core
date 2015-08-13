var async = require('async'),
    _ = require('underscore'),
    mustache = require('mustache'),
    config = require('../config'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    messages = require('../lib/messages'),
    validation = require('../lib/validation');

module.exports = {
    _addErr: function(event_type, config, doc) {
        var locale = utils.getLocale(doc),
            err_msg = 'Failed to complete notification, event type "%s" misconfigured.',
            evConf = _.findWhere(config.messages, {
                event_type: event_type
            });
        var msg = messages.getMessage(evConf && evConf.message, locale);
        if (msg) {
            messages.addError(doc, msg);
        } else {
            messages.addError(doc, err_msg.replace('%s', event_type));
        }
    },
    _addMsg: function(event_type, config, doc, registrations) {
        var locale = utils.getLocale(doc),
            evConf = _.findWhere(config.messages, {
                event_type: event_type
            });
        var msg = messages.getMessage(evConf && evConf.message, locale);
        if (msg) {
            messages.addMessage({
                doc: doc,
                message: msg,
                phone: messages.getRecipientPhone(doc, msg.recipient),
                registrations: registrations
            });
        } else {
            module.exports._addErr(event_type, config, doc);
        }
    },
    filter: function(doc) {
        return Boolean(
            doc &&
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
        var self = module.exports,
            doc = change.doc,
            patient_id = doc.patient_id,
            config = module.exports.getConfig(),
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

        self.validate(config, doc, function(errors) {

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

                if (err) {
                    callback(err);
                } else if (registrations.length) {
                    if (mute) {
                        if (config.confirm_deactivation) {
                            self._addErr('confirm_deactivation', config, doc);
                            return callback(null, true);
                        } else {
                            self._addMsg('on_mute', config, doc, registrations);
                        }
                    } else {
                        self._addMsg('on_unmute', config, doc, registrations);
                    }
                    async.each(registrations, function(registration, callback) {
                        self.modifyRegistration({
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
                    self._addErr('patient_not_found', config, doc);
                    self._addMsg('patient_not_found', config, doc, registrations);
                    callback(null, true);
                }
            });
        });
    }
};
