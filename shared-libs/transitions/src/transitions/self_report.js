const transitionUtils = require('./utils');
const config = require('../config');
const NAME = 'self_report';
const { Contact, Qualifier } = require('@medic/cht-datasource');
const dataContext = require('../data-context');
const getConfig = () => config.get(NAME) || [];
const { DOC_TYPES } = require('@medic/constants');

const getConfiguredForm = (form) => form && getConfig().find(item => item && item.form === form);

const hasPatientId = doc => doc.fields && (doc.fields.patient_id || doc.fields.patient_uuid);

module.exports = {
  name: NAME,
  filter: ({ doc, info }) => {
    return Boolean(
      doc &&
      doc.from &&
      doc.type === DOC_TYPES.DATA_RECORD &&
      getConfiguredForm(doc.form) &&
      !hasPatientId(doc) &&
      !transitionUtils.hasRun(info, NAME)
    );
  },
  onMatch: change => {
    const doc = change.doc;
    const formConfig = getConfiguredForm(doc.form);
    const getContactUuids = dataContext.bind(Contact.v1.getUuidsPage);
    const getContactWithLineage = dataContext.bind(Contact.v1.getWithLineage);

    return getContactUuids(Qualifier.byPhone(String(doc.from)), null, 1)
      .then(page => {
        if (!page.data.length) {
          transitionUtils.addRejectionMessage(doc, formConfig, 'sender_not_found');
          return true;
        }

        return getContactWithLineage(Qualifier.byUuid(page.data[0])).then(patient => {
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
