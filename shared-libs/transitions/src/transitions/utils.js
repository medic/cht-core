const db = require('../db');
const messages = require('../lib/messages');
const utils = require('../lib/utils');
const idGenerator = require('../lib/ids').generator(db);
const config = require('../config');
const validation = require('@medic/validation');
const logger = require('../lib/logger');

validation.init({ db, translate: utils.translate, settings: config.getAll(), logger });

const findFirstMatchingMessage = (config, eventType) => {
  if (!config.messages || !config.messages.length) {
    return null;
  }
  const matches = config.messages.filter(msg => msg.event_type === eventType);
  return matches && matches.length && matches[0];
};

module.exports = {
  /*
    Adds a "message" and "error" of the configured key to the report. This
    indicates something went wrong, and the key indicates what went wrong.
  */
  addRejectionMessage: (doc, reportConfig, errorKey, context = {}) => {
    const config = findFirstMatchingMessage(reportConfig, errorKey);
    let message;
    let errorMessage;
    if (config) {
      errorMessage = messages.getMessage(config, utils.getLocale(doc));
      message = config;
    } else {
      message = { translation_key: `messages.generic.${errorKey}` };
      errorMessage = messages.getMessage(message, utils.getLocale(doc));
    }
    const recipient = config && config.recipient || 'from';
    // A "message" ends up being a doc.task, which is something that is sent to
    // the caller via SMS
    messages.addMessage(doc, message, recipient, context);
    // An "error" ends up being a doc.error, which is something that is shown
    // on the screen when you view the error. We need both
    messages.addError(doc, {
      message: errorMessage,
      code: errorKey
    }, context);
  },

  addSuccessMessage: (doc, reportConfig, eventType, context = {}) => {
    const config = findFirstMatchingMessage(reportConfig, eventType);
    if (!config) {
      return;
    }

    messages.addMessage(doc, config, config.recipient, context);
  },

  addRegistrationNotFoundError: (doc, reportConfig) => {
    module.exports.addRejectionMessage(doc, reportConfig, 'registration_not_found');
  },
  isIdUnique: (id) => {
    return db.medic
      .query('medic-client/contacts_by_reference', { key: ['shortcode', id] })
      .then(results => !(results && results.rows && results.rows.length));
  },
  addUniqueId: (doc) => {
    return idGenerator.next().value.then(patientId => {
      doc.patient_id = patientId;
    });
  },
  isPhoneUnique: (phone) => {
    return db.medic
      .query('medic-client/contacts_by_reference', { key: ['shortcode', id] })
      .then(results => !(results && results.rows && results.rows.length));
  },
  getUniqueId: () => idGenerator.next().value,

  hasRun: (doc, transition) => {
    return !!(doc.transitions && doc.transitions[transition]);
  },

  getDeprecationMessage: (name, deprecatedIn, extraInfo) => {
    if (!name) {
      return;
    }

    let message = name + ' transition is deprecated';

    if (deprecatedIn) {
      message += ' since ' + deprecatedIn;
    }

    if (extraInfo) {
      message += '. ' + extraInfo;
    }

    return message;
  },

  validate: (config, doc) => {
    const validations = config && config.validations && config.validations.list;
    return validation.validate(doc, validations);
  },
};
