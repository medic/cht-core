const _ = require('underscore'),
  config = require('../config'),
  utils = require('../lib/utils'),
  objectPath = require('object-path'),
  transitionUtils = require('./utils'),
  db = require('../db'),
  TRANSITION_NAME = 'death_reporting',
  CONFIG_NAME = 'death_reporting',
  MARK_PROPERTY_NAME = 'mark_deceased_forms',
  UNDO_PROPERTY_NAME = 'undo_deceased_forms',
  DATE_FIELD_PROPERTY_NAME = 'date_field';

const getConfig = () => config.get(CONFIG_NAME) || {};
const getConfirmFormCodes = () => getConfig()[MARK_PROPERTY_NAME] || [];
const getUndoFormCodes = () => getConfig()[UNDO_PROPERTY_NAME] || [];
const getDateField = () => getConfig()[DATE_FIELD_PROPERTY_NAME];
const isConfirmForm = form => getConfirmFormCodes().includes(form);
const isUndoForm = form => getUndoFormCodes().includes(form);

const getDateOfDeath = report => {
  const config = getDateField();
  return (config && objectPath.get(report, config)) || report.reported_date; // default to the date the death was confirmed
};

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
    const forms = getConfirmFormCodes();
    if (!forms || !_.isArray(forms) || !forms.length) {
      throw new Error(`Configuration error. Config must define have a '${CONFIG_NAME}.${MARK_PROPERTY_NAME}' array defined.`);
    }
  },
  filter: (doc, info = {}) => {
    return Boolean(
      doc &&
      doc.form &&
      doc.type === 'data_record' &&
      (isConfirmForm(doc.form) || isUndoForm(doc.form)) &&
      doc.patient &&
      !transitionUtils.hasRun(info, TRANSITION_NAME) &&
      utils.isValidSubmission(doc)
    );
  },
  onMatch: change => {
    const hydratedPatient = change.doc.patient;
    if (!hydratedPatient._id) {
      return Promise.resolve(false);
    }

    return db.medic
      .get(hydratedPatient._id)
      .then(patient => updatePatient(patient, change.doc))
      .then(changed => !!changed);
  },
};
