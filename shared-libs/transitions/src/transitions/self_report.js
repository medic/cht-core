const transitionUtils = require('./utils');
const config = require('../config');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);

const getConfig = (transition) => config.get(transition.name) || [];

const getConfiguredForm = (form, transition) => form && getConfig(transition).find(item => item && item.form === form);

const hasPatientId = doc => doc.fields && (doc.fields.patient_id || doc.fields.patient_uuid);

module.exports = {
  name: 'self_report',
  deprecated: false,
  deprecatedIn: '',
  getDeprecationMessage: () => {
    const self = module.exports;
    return `"${self.name}" transition is deprecated in ${self.deprecatedIn}.`;
  },
  filter: (doc, info={}) => {
    const self = module.exports;
    return Boolean(
      doc &&
      doc.from &&
      doc.type === 'data_record' &&
      getConfiguredForm(doc.form, self) &&
      !hasPatientId(doc) &&
      !transitionUtils.hasRun(info, self.name)
    );
  },
  onMatch: change => {
    const self = module.exports;
    const doc = change.doc;
    const formConfig = getConfiguredForm(doc.form, self);

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
