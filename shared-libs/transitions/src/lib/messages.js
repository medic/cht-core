const _ = require('lodash');
const phoneNumber = require('@medic/phone-number');
const messageUtils = require('@medic/message-utils');
const utils = require('./utils');
const config = require('../config');
const history = require('./history');
const logger = require('./logger');

const messageStatus = (from, msg) => {
  let status = 'denied';
  if (module.exports.isOutgoingAllowed(from)) {
    status = history.check(msg.to, msg.message) ? 'duplicate' : 'pending';
  }
  return status;
};

const sanitize = x => x && x.toLowerCase().trim();

const isDeniedByList = (from, denyList) => {
  return (
    denyList &&
    denyList.split(',').some(listItem => {
      const sanitizedItem = sanitize(listItem);
      return sanitizedItem && sanitize(from).startsWith(sanitizedItem);
    })
  );
};

const isDeniedByShortcodes = (from, denyIfShorterThan) => {
  const allowableLength = parseInt(denyIfShorterThan);
  return allowableLength > 0 && sanitize(from).length < allowableLength;
};

const isDeniedByAlphas = (from, denyWithAlphas) => {
  return denyWithAlphas === true && from.match(/[a-z]/i);
};

module.exports = {
  addMessage: (doc, messageConfig, recipient = 'reporting_unit', context = {}) => {
    doc.tasks = doc.tasks || [];
    const content = {
      translationKey: messageConfig.translation_key,
      message: messageConfig.message, // deprecated usage
    };
    try {
      const generated = messageUtils.generate(
        config.getAll(),
        utils.translate,
        doc,
        content,
        recipient,
        context
      );
      const task = { messages: generated };
      utils.setTaskState(task, messageStatus(doc.from, generated[0]));
      doc.tasks.push(task);
      return task;
    } catch (e) {
      utils.addError(doc, {
        message:
          e.message + ': ' + messageConfig.translation_key ||
          messageConfig.messages,
        code: 'parse_error',
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
    const messages = configuration.messages || configuration.message;
    if (!_.isArray(messages)) {
      logger.warn(
        'Message property should be an array. Please check your configuration.'
      );
      return '';
    }
    if (!messages.length) {
      logger.warn(
        'Message property array was empty. Please check your configuration.'
      );
      return '';
    }
    // default to first item in messages array in case locale match fails
    const message =
      _.find(messages, { locale: locale || 'en' }) || messages[0];
    return (message.content && message.content.trim()) || '';
  },
  /*
     * Return true when the recipient phone is not denied.
     *
     * Deny if any
     * - recipient phone number matches gateway number
     * - outgoing_deny_list is a comma delimited list, deny when start of the recipient phone number matches any entry
     * - outgoing_deny_shorter_than is an integer, deny when the recipient phone number is shorter than
     * - outgoing_deny_with_alphas is a boolean, deny when true and the recipient phone number contains letters
     *
     * When denied, set up a response with a denied state. The pending message process will
     * ignore these messages and those reports will be left without an auto-reply. The
     * denied messages still show up in the messages export.
     *
     * @param {String} from - Recipient phone number
     * @returns {Boolean}
     */
  isOutgoingAllowed: from => {
    if (!from) {
      return true;
    }

    if (module.exports.isMessageFromGateway(from)) {
      return false;
    }

    const {
      outgoing_deny_list,
      outgoing_deny_shorter_than,
      outgoing_deny_with_alphas,
    } = config.getAll();
    return (
      !isDeniedByShortcodes(from, outgoing_deny_shorter_than) &&
      !isDeniedByAlphas(from, outgoing_deny_with_alphas) &&
      !isDeniedByList(from, outgoing_deny_list)
    );
  },
  addErrors: function(config, doc, errors, context) {
    errors.forEach(error => module.exports.addError(doc, error, context));
    let reply;
    if (config.validations.join_responses) {
      reply = errors
        .filter(err => err)
        .map(err => err.message || err)
        .join('  ');
    } else {
      reply = errors[0].message || errors[0];
    }
    module.exports.addMessage(doc, { message: reply });
  },
  addError: function(doc, error, context) {
    if (_.isString(error)) {
      error = {
        message: error,
      };
    } else if (_.isObject(error)) {
      if (!error.message) {
        logger.warn('Message property missing on error object.');
        error.message = 'Error: ' + JSON.stringify(error);
      }
    } else {
      logger.warn('Error should be an object or string.');
      error = {
        message: 'Error: ' + JSON.stringify(error),
      };
    }
    // support mustache template syntax in error messages
    try {
      error.message = messageUtils.template(
        config,
        utils.translate,
        doc,
        error,
        context
      );
      utils.addError(doc, error);
    } catch (e) {
      utils.addError(doc, {
        message: e.message + ': ' + JSON.stringify(error),
        code: 'parse_error',
      });
    }
  },
  /*
     * Used to avoid infinite loops of auto-reply messages between gateway and
     * itself.
     */
  isMessageFromGateway: from => {
    const gateway = config.get('gateway_number');
    return (
      typeof gateway === 'string' &&
      typeof from === 'string' &&
      phoneNumber.same(gateway, from)
    );
  },
};
