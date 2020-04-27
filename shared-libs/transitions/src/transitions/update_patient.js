const transitionUtils = require('./utils');
const config = require('../config');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const NAME = 'update_patient';

const getConfig = () => config.get(NAME) || {};
const getConfiguredForms = () => getConfig().forms || [];
const isConfiguredForm = (form) => form && getConfiguredForms().includes(form);

const hasPatientId = doc => doc.fields && (doc.fields.patient_id || doc.fields.patient_uuid);

module.exports = {
  filter: (doc, info={}) => {
    return Boolean(
      doc &&
      doc.from &&
      doc.type === 'data_record' &&
      isConfiguredForm(doc.form) &&
      !hasPatientId(doc) &&
      !transitionUtils.hasRun(info, NAME)
    );
  },
  onMatch: change => {
    const doc = change.doc;

    return db.medic
      .query('medic-client/contacts_by_phone', { key: doc.from })
      .then(result => {
        if (!result.rows || !result.rows.length || !result.rows[0].id) {
          return;
        }

        return lineage
          .fetchHydratedDoc(result.rows[0].id)
          .then(patient => {
            if (!patient) {
              return;
            }

            doc.patient = patient;

            if (!doc.fields) {
              doc.fields = {};
            }
            doc.fields.patient_uuid = patient._id;
            doc.fields.patient_id = patient.patient_id;

            return true;
          });
      });
  }
};
