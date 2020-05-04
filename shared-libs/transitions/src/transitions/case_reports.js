const config = require('../config');
const messages = require('../lib/messages');
const validation = require('../lib/validation');
const utils = require('../lib/utils');
const transitionUtils = require('./utils');
const acceptPatientReports = require('./accept_patient_reports');

const NAME = 'case_reports';

const getConfig = form => {
  const fullConfig = config.get('case_reports') || [];
  return fullConfig.find(config => config.form === form);
};

const validate = (config, doc) => {
  const validations = config.validations && config.validations.list;
  return new Promise(resolve => {
    validation.validate(doc, validations, errors => {
      resolve(errors);
    });
  });
};

// NB: this is very similar to a function in the registration transition, except
//     they also allow for an empty event_type
const messageRelevant = (msg, doc) => {
  if (msg.event_type === 'report_accepted') {
    const expr = msg.bool_expr;
    if (utils.isNonEmptyString(expr)) {
      return utils.evalExpression(expr, { doc });
    }
    return true;
  }
};

const addMessagesToDoc = (doc, config, registrations) => {
  if (config.messages) {
    config.messages.forEach(msg => {
      if (messageRelevant(msg, doc)) {
        messages.addMessage(doc, msg, msg.recipient, {
          patient: doc.patient,
          registrations
        });
      }
    });
  }
};

const getCaseRegistrations = doc => {
  const caseId = doc.case_id || (doc.fields && doc.fields.case_id);
  if (!caseId) {
    return;
  }
  return utils.getReportsBySubject({ id: caseId, registrations: true });
};

const silenceRegistrations = (doc, config, registrations) => {
  return new Promise((resolve, reject) => {
    acceptPatientReports.silenceRegistrations(
      config,
      doc,
      registrations,
      (err, result) => err ? reject(err) : resolve(result)
    );
  });
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
  filter: function(doc, info = {}) {
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

    return validate(config, doc).then(errors => {
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
