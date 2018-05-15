var async = require('async'),
    _ = require('underscore'),
    config = require('../config'),
    utils = require('../lib/utils'),
    messages = require('../lib/messages'),
    validation = require('../lib/validation'),
    db = require('../db-nano'),
    transitionUtils = require('./utils'),
    NAME = 'update_notifications';

var isConfigured = function(config, eventType) {
    return config && config.messages && config.messages.some(message => {
        return message.event_type === eventType &&
               (message.message || message.translation_key);
    });
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
    var msg = isConfigured(config, mute ? 'on_mute' : 'on_unmute');
    if (!msg) {
        // no configured message for the given eventType
        return false;
    }
    return { mute: mute };
};

module.exports = {
    _addErr: function(event_type, config, doc) {
        var locale = utils.getLocale(doc),
            evConf = _.findWhere(config.messages, {
                event_type: event_type
            });
        var msg = messages.getMessage(evConf, locale);
        if (msg) {
            messages.addError(doc, msg);
        } else {
            messages.addError(doc, `Failed to complete notification request, event type "${event_type}" misconfigured.`);
        }
    },
    _addMsg: function(event_type, config, doc, registrations, patient) {
        const msgConfig = _.findWhere(config.messages, {
            event_type: event_type
        });
        if (msgConfig) {
            const templateContext = {
                registrations: registrations,
                patient: patient
            };
            messages.addMessage(doc, msgConfig, msgConfig.recipient, templateContext);
        } else {
            module.exports._addErr(event_type, config, doc);
        }
    },
    filter: function(doc, info={}) {
        return Boolean(
            doc &&
            doc.form &&
            doc.type === 'data_record' &&
            doc.fields &&
            doc.fields.patient_id &&
            !transitionUtils.hasRun(info, NAME)
        );
    },
    getConfig: function() {
        return _.extend({}, config.get('notifications'));
    },
    modifyRegistration: function(options, callback) {
        var mute = options.mute,
            registration = options.registration;

        if (mute) {
            utils.muteScheduledMessages(registration);
        } else {
            utils.unmuteScheduledMessages(registration);
        }
        db.audit.saveDoc(registration, callback);
    },
    validate: function(config, doc, callback) {
        var validations = config.validations && config.validations.list;
        return validation.validate(doc, validations, callback);
    },
    onMatch: change => {
        return new Promise((resolve, reject) => {
            var self = module.exports,
                doc = change.doc,
                patient_id = doc.fields && doc.fields.patient_id,
                config = module.exports.getConfig(),
                eventType = getEventType(config, doc);

            if (!eventType) {
                return resolve();
            }

            self.validate(config, doc, function(errors) {

                if (errors && errors.length > 0) {
                    messages.addErrors(config, doc, errors, { patient: doc.patient });
                    return resolve(true);
                }

                async.parallel({
                  registrations: _.partial(utils.getRegistrations, {db: db, id: patient_id}),
                  patient: _.partial(utils.getPatientContact, db, patient_id)
                }, (err, {registrations, patient}) => {

                    if (err) {
                        return reject(err);
                    }

                    if (patient && registrations.length) {
                        if (eventType.mute) {
                            if (config.confirm_deactivation) {
                                self._addErr('confirm_deactivation', config, doc);
                                self._addMsg('confirm_deactivation', config, doc, registrations, patient);
                                return resolve(true);
                            } else {
                                self._addMsg('on_mute', config, doc, registrations, patient);
                            }
                        } else {
                            self._addMsg('on_unmute', config, doc, registrations, patient);
                        }
                        async.each(registrations, function(registration, callback) {
                            self.modifyRegistration({
                                mute: eventType.mute,
                                registration: registration
                            }, callback);
                        }, function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(true);
                            }
                        });
                    } else {
                        self._addErr('patient_not_found', config, doc);
                        self._addMsg('patient_not_found', config, doc);
                        resolve(true);
                    }
                });
            });
        });
    }
};
