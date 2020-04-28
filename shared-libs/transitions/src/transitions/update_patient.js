const transitionUtils = require('./utils');
const config = require('../config');
const db = require('../db');
const messages = require('../lib/messages');
const utils = require('../lib/utils');
const lineage = require('@medic/lineage')(Promise, db.medic);
const NAME = 'update_patient';

const getConfig = () => config.get(NAME) || [];
const getConfiguredForm = (form) => form && getConfig().find(item => item && item.form === form);

const hasPatientId = doc => doc.fields && (doc.fields.patient_id || doc.fields.patient_uuid);


const getMsg = (doc, eventType, formConfig) => {
  if (!formConfig.messages) {
    return {};
  }

  const locale = utils.getLocale(doc);
  const eventConfig = formConfig.messages.find(message => message.event_type === eventType);
  return {
    eventConfig,
    msg: messages.getMessage(eventConfig, locale),
  };
};

const addError = (doc, eventType, formConf) => {
  const { msg, eventConfig } = getMsg(doc, eventType, formConf);
  if (msg) {
    messages.addError(doc, msg);
    messages.addMessage(doc, eventConfig, eventConfig.recipient);
  } else {
    messages.addError(doc, `Sender not found`);
  }
};

const addMsg = (doc, eventType, formConfig) => {
  const { msg, eventConfig } = getMsg(doc, eventType, formConfig);
  if (msg) {
    messages.addMessage(doc, eventConfig, eventConfig.recipient, { patient: doc.patient });
  }
};

module.exports = {
  filter: (doc, info={}) => {
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
      .query('medic-client/contacts_by_phone', { key: doc.from })
      .then(result => {
        if (!result.rows || !result.rows.length || !result.rows[0].id) {
          addError(doc, 'sender_not_found', formConfig);
          return true;
        }

        return lineage
          .fetchHydratedDoc(result.rows[0].id)
          .then(patient => {
            doc.patient = patient;

            if (!doc.fields) {
              doc.fields = {};
            }
            doc.fields.patient_uuid = patient._id;
            doc.fields.patient_id = patient.patient_id;

            addMsg(doc, 'report_accepted', formConfig);
            return true;
          });
      });
  }
};
