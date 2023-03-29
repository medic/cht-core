const config = require('../config');
const messages = require('../lib/messages');
const utils = require('../lib/utils');
const transitionUtils = require('./utils');
const acceptPatientReports = require('./accept_patient_reports');
const NAME = 'accept_case_reports';

const getConfig = form => {
  const fullConfig = config.get('accept_case_reports') || [];
  return fullConfig.find(config => config.form === form);
};

// NB: this is very similar to a function in the registration transition, except
//     they also allow for an empty event_type
const messageRelevant = (msg, doc) => {
  if (msg.event_type !== 'report_accepted') {
    return;
  }
  const expr = msg.bool_expr;
  if (utils.isNonEmptyString(expr)) {
    return utils.evalExpression(expr, { doc });
  }
  return true;
};

const addMessagesToDoc = (doc, config, registrations) => {
  if (!config.messages) {
    return;
  }
  config.messages.forEach(msg => {
    if (messageRelevant(msg, doc)) {
      messages.addMessage(doc, msg, msg.recipient, {
        patient: doc.patient,
        registrations,
        place: doc.place,
      });
    }
  });
};

const getCaseRegistrations = doc => {
  const caseId = doc.case_id || (doc.fields && doc.fields.case_id);
  if (!caseId) {
    return Promise.resolve([]);
  }
  return utils.getReportsBySubject({ id: caseId, registrations: true });
};

const silenceRegistrations = (doc, config, registrations) => {
  return acceptPatientReports.silenceRegistrations(config, doc, registrations);
};

const updatePlaceUuid = (doc, registrations) => {
  const placeId = registrations.length &&
    registrations[0].fields &&
    registrations[0].fields.place_uuid;
  if (!placeId) {
    return;
  }
  if (!doc.fields) {
    doc.fields = {};
  }
  doc.fields.place_uuid = placeId;
};

module.exports = {
  name: NAME,
  filter: function({ doc, info }) {
    return Boolean(
      doc &&
      doc.type === 'data_record' &&
      doc.form &&
      doc.reported_date &&
      !transitionUtils.hasRun(info, NAME) &&
      getConfig(doc.form) &&
      utils.isValidSubmission(doc) // requires either an xform, a public sms form or a known submitter
    );
  },
  onMatch: ({ doc }) => {
    const config = getConfig(doc.form);
    if (!config) {
      return Promise.resolve();
    }

    return transitionUtils.validate(config, doc).then(errors => {
      if (errors && errors.length > 0) {
        messages.addErrors(config, doc, errors);
        return true;
      }
      return getCaseRegistrations(doc).then(registrations => {
        if (!registrations.length) {
          transitionUtils.addRegistrationNotFoundError(doc, config);
          return true;
        }
        addMessagesToDoc(doc, config, registrations);
        updatePlaceUuid(doc, registrations);
        return silenceRegistrations(doc, config, registrations);
      });
    });

  }
};
