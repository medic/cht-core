var _ = require('underscore'),
    phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance(),
    utils = require('./utils'),
    messageUtils = require('./message-utils'),
    config = require('../config');

module.exports = {
    addMessage: (doc, messageConfig, recipient = 'clinic', context = {}) => {
        doc.tasks = doc.tasks || [];
        const content = {
            translationKey: messageConfig.translation_key,
            message: messageConfig.message // deprecated usage
        };
        try {
            const messages = messageUtils.generate(
                config.getAll(),
                utils.translate,
                doc,
                content,
                recipient,
                context
            );
            const task = { messages: messages };
            utils.setTaskState(task, module.exports.isOutgoingAllowed(doc.from) ? 'pending' : 'denied');
            doc.tasks.push(task);
            return task;
        } catch(e) {
            utils.addError(doc, {
                message: e.message + ': ' + messageConfig.translation_key || messageConfig.messages,
                code: 'parse_error'
            });
        }
    },
    /*
     * Take message configuration and return message content. The configuration
     * should have either a `messages` property with an array of messages, or
     * a `translation_key` property with a string.
     * Use locale if found otherwise defaults to 'en'.
     */
    getMessage: function(configuration, locale) {
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
    },
    /*
     * Return false when the recipient phone matches the denied list.
     *
     * outgoing_deny_list is a comma separated list of strings. If a string in
     * that list matches the beginning of the phone then we set up a response
     * with a denied state. The pending message process will ignore these
     * messages and those reports will be left without an auto-reply. The
     * denied messages still show up in the messages export.
     *
     * @param {String} from - Recipient phone number
     * @returns {Boolean}
     */
    isOutgoingAllowed: from => {
      const conf = config.get('outgoing_deny_list') || '';
      if (!from) {
        return true;
      }
      if (module.exports.isMessageFromGateway(from)) {
        return false;
      }
      return _.every(conf.split(','), s => {
        // ignore falsey inputs
        if (!s) {
          return true;
        }
        // return false if we get a case insensitive starts with match
        return from.toLowerCase().indexOf(s.trim().toLowerCase()) !== 0;
      });
    },
    addErrors: function(config, doc, errors) {
        const self = module.exports;
        
        errors.forEach(error => self.addError(doc, error));
        
        let reply;
        if (config.validations.join_responses) {
            const msgs = [];
            errors.forEach(err => {
                if (err.message) {
                    msgs.push(err.message);
                } else if (err) {
                    msgs.push(err);
                }
            });
            reply = msgs.join('  ');
        } else {
            reply = errors[0].message || errors[0];
        }

        self.addMessage(doc, { message: reply }, 'clinic');
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
            error.message = messageUtils.template(config, utils.translate, doc, error);
            utils.addError(doc, error);
        } catch(e) {
            utils.addError(doc, {
                message: e.message + ': ' + JSON.stringify(error),
                code: 'parse_error'
            });
        }
    },
    /*
     * Used to avoid infinite loops of auto-reply messages between gateway and
     * itself.
     */
    isMessageFromGateway: from => {
        const gw = config.get('gateway_number');
        if (typeof gw === 'string' && typeof from === 'string') {
            return phoneUtil.isNumberMatch(gw, from) >= 3;
        }
        return false;
    }
};
