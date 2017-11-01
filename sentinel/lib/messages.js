var _ = require('underscore'),
    template = require('./template'),
    utils = require('./utils'),
    logger = require('./logger');

function extendedTemplateContext(doc, extras) {
    const templateContext = module.exports.extractTemplateContext(doc);

    if (extras.templateContext) {
        _.defaults(templateContext, extras.templateContext);
    }

    if (extras.patient) {
        _.defaults(templateContext, module.exports.extractTemplateContext(extras.patient));

        // Don't want to add this to extractTemplateContext as 'name' is too generic
        // and eTC gets called elsewhere
        templateContext.patient_name = templateContext.patient_name || extras.patient.name;
    }

    if (extras.registrations && extras.registrations.length) {
        _.defaults(templateContext, module.exports.extractTemplateContext(extras.registrations[0]));
    }

    if (!extras.patient && extras.registrations && extras.registrations.length) {
        // If you're providing registrations to the template context you need to
        // provide the patient contact document as well. Patients can be
        // "registered" through the UI, only creating a patient and no registration report
        throw Error('Cannot provide registrations to template context without a patient');
    }

    return templateContext;
}

/**
 * Expected opts :
 * - doc
 * - message : template for the message
 * - phone (optional, will get clinic phone if absent)
 * - templateContext (optional)
 * - registrations (optional)
 * - patient (optional)
 * - state (optional)
 * - taskFields (optional)
 * All other fields are ignored.
 */
function addMessage(opts) {
    var self = module.exports,
        doc = opts.doc,
        templateContext = extendedTemplateContext(doc, opts),
        phone = opts.phone || self.getRecipientPhone(doc, 'clinic');

    if (!phone) {
        logger.debug(`Can't add message, no phone number found in opts: ${opts}`);
        return;
    }

    if (!opts.message) {
        logger.debug(`Can't add message, no message template found in opts: ${opts}`);
        return;
    }

    let outputOpts = {
        phone: String(phone),
        message: template.render(opts.message, templateContext),
        state: utils.isOutgoingAllowed(doc.from) ? opts.state : 'denied'
    };

    _.defaults(outputOpts, opts.taskFields);

    if (logger.level === 'debug') {
        logger.debug(`Adding message: ${outputOpts}`);
    }
    try {
        utils.addMessage(doc, outputOpts);
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
    scheduleMessage: function(doc, msg, phone, registrations, patient) {
        var templateContext = extendedTemplateContext(doc, {
            registrations: registrations,
            patient: patient
        });

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
        } else if (doc.fields && doc.fields[recipient]) {
            // Try to resolve a specified property/field name
            phone = doc.fields[recipient];
        } else if (doc[recipient]) {
            // Or directly on the doc
            phone = doc[recipient];
        } else if (recipient.indexOf('.') > -1) {
            // Or multiple layers by executing it as a statement
            try {
                phone = utils.evalExpression({doc: doc}, 'doc.' + recipient);
            } catch (err) {
                logger.error(`Recipient expression "${recipient}" failed on ${doc._id}`);
            }
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
