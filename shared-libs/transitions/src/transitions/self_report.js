const transitionUtils = require('./utils');
const config = require('../config');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const NAME = 'self_report';

const getConfig = () => config.get(NAME) || [];

const getConfiguredForm = (form) => form && getConfig().find(item => item && item.form === form);

const hasPatientId = doc => doc.fields && (doc.fields.patient_id || doc.fields.patient_uuid);

module.exports = {
  name: NAME,
  filter: ({ doc, info }) => {
    return Boolean(
      doc &&
      doc.from &&
      doc.type === 'data_record' &&
      getConfiguredForm(doc.form) &&
      !hasPatientId(doc) &&
      !transitionUtils.hasRun(info, NAME)
    );
  },
  onMatch: change => {
    const doc = change.doc;
    const formConfig = getConfiguredForm(doc.form);

    return db.medic
      .query('medic-client/contacts_by_phone', { key: String(doc.from) })
      .then(result => {
        if (!result.rows || !result.rows.length || !result.rows[0].id) {
          transitionUtils.addRejectionMessage(doc, formConfig, 'sender_not_found');
          return true;
        }

        return lineage.fetchHydratedDoc(result.rows[0].id).then(patient => {
          doc.patient = patient;

          if (!doc.fields) {
            doc.fields = {};
          }
          doc.fields.patient_uuid = patient._id;
          doc.fields.patient_id = patient.patient_id;

          transitionUtils.addSuccessMessage(doc, formConfig, 'report_accepted');
          return true;
        });
      });
  }
};
