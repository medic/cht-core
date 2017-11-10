var _ = require('underscore'),
    template = require('./template'),
    utils = require('./utils'),
    logger = require('./logger'),
    messageUtils = require('./message-utils'),
    config = require('../config');

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
 * TODO WRITE DOCUMENTATION
 * TODO rename to addTask?
 */
const GARETH_addMessage = (doc, messageConfig, recipient = 'clinic', templateContext = {}) => {
    doc.tasks = doc.tasks || [];
    const content = {
        translationKey: messageConfig.translation_key,
        message: messageConfig.message // deprecated usage
    };
    try {
        const messages = messageUtils.generate(
            config,
            utils.translate,
            doc,
            content,
            recipient,
            templateContext
        );
        const task = {
            // TODO probably more fields to add here! (particularly for scheduled tasks)
            messages: messages
        };
        utils.setTaskState(task, utils.isOutgoingAllowed(doc.from) ? 'pending' : 'denied');
        doc.tasks.push(task);
        return task;
    } catch(e) {
        console.log('ERROR', e);
        utils.addError(doc, {
            message: e.message + ': ' + messageConfig.translation_key || messageConfig.messages,
            code: 'parse_error'
        });
    }
};


// const GARETH_addMessage = (doc, ) => {
//   const task = _.omit(options, 'message', 'phone', 'uuid', 'state');
//   task.messages = messageUtils.generate(config, module.exports.translate, doc, task, options);
//   setTaskState(task, options.state || 'pending');
// };


            // messages.GARETH_addMessage(doc, msg, msg.recipient, {
            //     patient: patientContact,
            //     registrations: registrations
            // });

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
        console.log('adding message in utils');
        utils.addMessage(doc, outputOpts);
    } catch(e) {
        console.log('adding error from utils');
        console.error(e);
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
 // TODO remove this too??
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
        try {
            const options = {
                due: msg.due,
                group: msg.group,
                phone: phone,
                type: msg.type,
                translation_key: msg.translation_key
            };
            if (!msg.translation_key) {
                const templateContext = extendedTemplateContext(doc, {
                    registrations: registrations,
                    patient: patient
                });
                options.message = template.render(msg.message, templateContext);
            }
            utils.addScheduledMessage(doc, options);
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
    // TODO replace this with version from message-utils???
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
    GARETH_addMessage: GARETH_addMessage,
    getMessage: getMessage,
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
