var _ = require('underscore'),
    template = require('./template'),
    utils = require('./utils'),
    logger = require('./logger');

/**
 * Expected opts :
 * - doc
 * - message : template for the message
 * - phone (optional, will get clinic phone if absent)
 * - templateContext (optional)
 * - registrations (optional)
 * - person (optional)
 * - state (optional)
 * All other fields are ignored.
 */
function addMessage(opts) {
    var self = module.exports,
        doc = opts.doc,
        templateContext = module.exports.extractTemplateContext(doc),
        phone = opts.phone || self.getRecipientPhone(doc, 'clinic');

    if (!phone) {
        logger.debug(`Can't add message, no phone number found in opts: ${opts}`);
        return;
    }

    if (!opts.message) {
        logger.debug(`Can't add message, no message template found in opts: ${opts}`);
        return;
    }

    if (opts.templateContext) {
        _.defaults(templateContext, opts.templateContext);
    }
    if (opts.registrations && opts.registrations.length) {
        _.defaults(templateContext, module.exports.extractTemplateContext(opts.registrations[0].doc));
    }

    if (opts.person) {
        templateContext.person = opts.person;

        // For backwards compatibilty. Configurers are used to the patient's
        // name being available here, so alias it for now. This could be dropped
        // in a future major release if we ever decide to revisit and
        // standardise how we expose data to the message templater.
        templateContext.patient_name = templateContext.patient_name || templateContext.person.name;
    }

    if (!utils.isOutgoingAllowed(doc.from)) {
        opts.state = 'denied';
    }

    if (logger.level === 'debug') {
        logger.debug(`Adding message: ${opts.message}`);
        logger.debug(`With: ${templateContext}`);
    }
    try {
        utils.addMessage(doc, {
            phone: String(phone),
            message: template.render(opts.message, templateContext),
            state: opts.state
        });
    } catch(e) {
        utils.addError(doc, {
            message: e.message + ': ' + opts.message,
            code: 'parse_error'
        });
    }
}

/*
 * Take message configuration and return message content. The configuration
 * should have either a `messages` property with an array of messages, or
 * a `translation_key` property with a string.
 * Use locale if found otherwise defaults to 'en'.
 */
function getMessage(configuration, locale) {
    if (!configuration) {
        return '';
    }

    // use the translation key if provided
    if (configuration.translation_key) {
        return utils.translate(configuration.translation_key, locale);
    }

    // otherwise, use the configured messages (deprecated)
    var messages = configuration.messages || configuration.message;
    if (!_.isArray(messages)) {
        console.warn('Message property should be an array. Please check your configuration.');
        return '';
    }
    if (!messages.length) {
        console.warn('Message property array was empty. Please check your configuration.');
        return '';
    }
    // default to first item in messages array in case locale match fails
    var message = _.findWhere(messages, { locale: locale || 'en' }) || messages[0];
    return (message.content && message.content.trim()) || '';
}

module.exports = {
    /*
     * Provide some extra template context, internal fields always override
     * doc/form fields.
     */
    extractTemplateContext: function(doc) {
        var clinic = utils.getClinic(doc);
        var internal = {
            contact: clinic && clinic.contact,
            clinic: clinic,
            parent: utils.getHealthCenter(doc),
            health_center: utils.getHealthCenter(doc),
            grandparent: utils.getDistrict(doc),
            district: utils.getDistrict(doc)
        };
        return _.defaults(internal, doc.fields, doc);
    },
    scheduleMessage: function(doc, msg, phone, registrations) {
        var templateContext = module.exports.extractTemplateContext(doc);
        if (registrations && registrations.length) {
            _.defaults(templateContext, module.exports.extractTemplateContext(registrations[0].doc));
        }
        phone = phone ? String(phone) : phone;

        try {
            utils.addScheduledMessage(doc, {
                due: msg.due,
                message: template.render(msg.message, templateContext),
                group: msg.group,
                phone: phone,
                type: msg.type,
                translation_key: msg.translation_key
            });
        } catch(e) {
            utils.addError(doc, {
                message: e.message + ': ' + msg.message,
                code: 'parse_error'
            });
        }
    },
    /*
    * Try to match a recipient return undefined otherwise.
    * Assumes `parent` is a health_center and `grandparent` is a district,
    * which might not work in all setups.
    */
    getRecipientPhone: function(doc, recipient, _default) {
        if (!doc) {
            return;
        }
        recipient = recipient && recipient.trim();
        if (!recipient) {
            return _default || doc.from;
        }
        var phone;
        if (recipient === 'reporting_unit') {
            phone = doc.from;
        } else if (recipient === 'clinic') {
            phone = utils.getClinicPhone(doc);
        } else if (recipient === 'parent') {
            phone = utils.getHealthCenterPhone(doc);
        } else if (recipient === 'grandparent') {
            phone = utils.getDistrictPhone(doc);
        }

        if (!phone && doc.fields && doc.fields[recipient]) {
            // try to resolve a specified property/field name
            phone = doc.fields[recipient];
        }
        return phone || _default || doc.from;
    },
    addMessage: addMessage,
    getMessage: getMessage,
    notifyGrandparent: function(doc, message, options) {
        var self = module.exports;
        addMessage({
            doc: doc,
            message: message,
            phone: self.getRecipientPhone(doc, 'grandparent_phone'),
            templateContext: options
        });
    },
    notifyParent: function(doc, message, options) {
        var self = module.exports;
        addMessage({
            doc: doc,
            message: message,
            phone: self.getRecipientPhone(doc, 'parent_phone'),
            templateContext: options
        });
    },
    addReply: function(doc, message, options) {
        var self = module.exports;
        addMessage({
            doc: doc,
            message: message,
            phone: self.getRecipientPhone(doc, 'clinic'),
            templateContext: options
        });
    },
    addErrors: function(doc, errors) {
        var self = module.exports;
        _.each(errors, function(error) {
            self.addError(doc, error);
        });
    },
    addError: function(doc, error) {
        if (_.isString(error)){
            error = {
                message: error
            };
        } else if (_.isObject(error)) {
            if (!error.message) {
                console.warn('Message property missing on error object.');
                error.message = 'Error: ' + JSON.stringify(error);
            }
        } else {
            console.warn('Error should be an object or string.');
            error = {
                message: 'Error: ' + JSON.stringify(error)
            };
        }
        // support mustache template syntax in error messages
        try {
            error.message = template.render(
                error.message, module.exports.extractTemplateContext(doc)
            );
            utils.addError(doc, error);
        } catch(e) {
            utils.addError(doc, {
                message: e.message + ': ' + JSON.stringify(error),
                code: 'parse_error'
            });
        }
    }
};
