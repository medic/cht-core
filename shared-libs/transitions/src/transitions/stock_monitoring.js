const _ = require('underscore'),
      config = require('../config'),
      db = require('../db'),
      transitionUtils = require('./utils'),
      utils = require('../lib/utils'),
      messages = require('../lib/messages'),
      validation = require('../lib/validation'),
      mutingUtils = require('../lib/muting_utils');

const TRANSITION_NAME = 'stock_monitoring',
      CONFIG_NAME = 'stock_monitoring',
      INCREMENT_PROPERTY = 'increment_forms',
      DECREMENT_PROPERTY = 'decrement_forms';

const getConfig = () => {
  return config.get(CONFIG_NAME) || {};
};

const isIncrementForm = form => {
  return Boolean(getConfig()[INCREMENT_PROPERTY].find(incrementFormId => utils.isFormCodeSame(form, incrementFormId)));
};

const isDecrementForm = form => {
  return Boolean(getConfig()[DECREMENT_PROPERTY].find(decrementFormId => utils.isFormCodeSame(form, decrementFormId)));
};

const isRelevantReport = (doc, info = {}) =>
  Boolean(doc &&
          doc.form &&
          doc.type === 'data_record' &&
          ( isIncrementForm(doc.form) || isDecrementForm(doc.form) ) &&
          !transitionUtils.hasRun(info, TRANSITION_NAME) &&
          utils.isValidSubmission(doc));

const updatePatient = (patient, doc) => {
  if (isConfirmForm(doc.form) && !patient.date_of_death) {
    patient.date_of_death = getDateOfDeath(doc);
  } else if (isUndoForm(doc.form) && patient.date_of_death) {
    delete patient.date_of_death;
  } else {
    // no update required - patient already in required state
    return;
  }

  return db.medic.put(patient);
};

module.exports = {
  init: () => {
    const incrementForms = getConfig()[INCREMENT_PROPERTY];
    if (!incrementForms || !_.isArray(incrementForms) || !incrementForms.length) {
      throw new Error(`Configuration error. Config must have a '${CONFIG_NAME}.${INCREMENT_PROPERTY}' array defined.`);
    }

    const decrementForms = getConfig()[DECREMENT_PROPERTY];
    if (!decrementForms || !_.isArray(decrementForms) || !decrementForms.length) {
      throw new Error(`Configuration error. Config must have a '${CONFIG_NAME}.${DECREMENT_PROPERTY}' array defined.`);
    }
  },

  filter: (doc, info = {}) => isRelevantReport(doc, info),

  onMatch: change => {
    const doc = change.doc;
    const config = getConfig(),
          maxCMM = config.max_cmm, message = config.message;

    return db.medic
      .query('medic-client/stock_cmm_by_contact', { 
        key: doc.contact._id, 
        reduce: true, 
        group: true 
      })
      .then(cmm => {
        if (cmm < maxCMM) {
          return;
        }

        messages.addMessage(doc, message.content, message.recipient);

        return true;
      });
  },
  asynchronousOnly: true
};
