const _ = require('underscore'),
      config = require('../config'),
      utils = require('../lib/utils'),
      transitionUtils = require('./utils'),
      TRANSITION_NAME = 'death_reporting',
      CONFIG_NAME = 'death_reporting',
      MARK_PROPERTY_NAME = 'mark_deceased_forms',
      UNDO_PROPERTY_NAME = 'undo_deceased_forms';

const getConfig = () => config.get(CONFIG_NAME) || {};
const getConfirmFormCodes = () => getConfig()[MARK_PROPERTY_NAME] || [];
const getUndoFormCodes = () => getConfig()[UNDO_PROPERTY_NAME] || [];
const isConfirmForm = form => getConfirmFormCodes().includes(form);
const isUndoForm = form => getUndoFormCodes().includes(form);

const updatePatient = (audit, patient, doc, callback) => {
  if (isConfirmForm(doc.form) && !patient.date_of_death) {
    patient.date_of_death = doc.reported_date;
  } else if (isUndoForm(doc.form) && patient.date_of_death) {
    delete patient.date_of_death;
  } else {
    // no update required - patient already in required state
    return callback(null, false);
  }
  audit.saveDoc(patient, err => {
    // return true so the transition is marked as executed
    callback(err, true);
  });
};

module.exports = {
  init: () => {
    const forms = getConfirmFormCodes();
    if (!forms || !_.isArray(forms) || !forms.length) {
      throw new Error(`Configuration error. Config must define have a '${CONFIG_NAME}.${MARK_PROPERTY_NAME}' array defined.`);
    }
  },
  filter: doc => {
    return doc &&
      doc.from &&
      doc.type === 'data_record' &&
      (isConfirmForm(doc.form) || isUndoForm(doc.form)) &&
      doc.fields &&
      doc.fields.patient_id &&
      !transitionUtils.hasRun(doc, TRANSITION_NAME);
  },
  onMatch: (change, db, audit, callback) => {
    const doc = change.doc;
    utils.getPatientContact(db, doc.fields.patient_id, (err, patient) => {
      if (err) {
        return callback(err);
      }
      updatePatient(audit, patient, doc, callback);
    });
  }
};
