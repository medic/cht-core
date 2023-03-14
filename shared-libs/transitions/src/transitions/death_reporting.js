const _ = require('lodash');
const config = require('../config');
const utils = require('../lib/utils');
const objectPath = require('object-path');
const transitionUtils = require('./utils');
const db = require('../db');
const NAME = 'death_reporting';
const CONFIG_NAME = 'death_reporting';
const MARK_PROPERTY_NAME = 'mark_deceased_forms';
const UNDO_PROPERTY_NAME = 'undo_deceased_forms';
const DATE_FIELD_PROPERTY_NAME = 'date_field';

const getConfig = () => config.get(CONFIG_NAME) || {};
const getConfirmFormCodes = () => getConfig()[MARK_PROPERTY_NAME] || [];
const getUndoFormCodes = () => getConfig()[UNDO_PROPERTY_NAME] || [];
const getDateField = () => getConfig()[DATE_FIELD_PROPERTY_NAME];
const isConfirmForm = form => getConfirmFormCodes().includes(form);
const isUndoForm = form => getUndoFormCodes().includes(form);

const getDateOfDeath = report => {
  const config = getDateField();
  // default to the date the death was confirmed
  return (config && objectPath.get(report, config)) || report.reported_date;
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
  name: NAME,
  init: () => {
    const forms = getConfirmFormCodes();
    if (!forms || !_.isArray(forms) || !forms.length) {
      throw new Error(`Configuration error. Config must have a '${CONFIG_NAME}.${MARK_PROPERTY_NAME}' array defined.`);
    }
  },
  filter: ({ doc, info }) => {
    return Boolean(
      doc &&
      doc.form &&
      doc.type === 'data_record' &&
      (isConfirmForm(doc.form) || isUndoForm(doc.form)) &&
      doc.patient &&
      !transitionUtils.hasRun(info, NAME) &&
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
