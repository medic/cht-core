const _ = require('underscore'),
  utils = require('../lib/utils'),
  transitionUtils = require('./utils'),
  logger = require('../lib/logger'),
  db = require('../db'),
  lineage = require('@medic/lineage')(Promise, db.medic),
  messages = require('../lib/messages'),
  validation = require('../lib/validation'),
  schedules = require('../lib/schedules'),
  acceptPatientReports = require('./accept_patient_reports'),
  moment = require('moment'),
  config = require('../config'),
  date = require('../date'),
  NAME = 'registration';

const findFirstDefinedValue = (doc, fields) => {
  const definedField = fields.find(field => doc.fields[field] !== undefined && doc.fields[field] !== null);
  return definedField && doc.fields[definedField];
};

const getRegistrations = (patientId) => {
  if (!patientId) {
    return Promise.resolve([]);
  }
  return utils.getRegistrations({ id: patientId });
};

const getPatientNameField = params => {
  if (Array.isArray(params) && params.length && params[0]) {
    return params[0];
  }

  if (params && params.patient_name_field) {
    return params.patient_name_field;
  }

  return 'patient_name';
};

const parseParams = params => {
  if (!params) {
    return {};
  }
  if (params instanceof Object) {
    // We support raw JSON even if we can't specify that
    // correctly in app_settings
    return params;
  }
  const firstCharacter = params.trim()[0];
  if (firstCharacter === '[' || firstCharacter === '{') {
    // We support JSON in a string, eg: '{"foo": "bar"}'
    return JSON.parse(params);
  }
  // And comma delimted strings, eg: "foo,bar", "foo"
  return params.split(',');
};

const booleanExpressionFails = (doc, expr) => {
  let result = false;

  if (utils.isNonEmptyString(expr)) {
    try {
      result = !utils.evalExpression(expr, { doc: doc });
    } catch (err) {
      // TODO should this count as a fail or as a real error
      logger.warn('Failed to eval boolean expression:');
      logger.info(err.toString());
      result = true;
    }
  }

  return result;
};

const getDOB = doc => {
  if (!doc || !doc.fields) {
    return '';
  }
  const reportedDate = moment(doc.reported_date).startOf('day');
  const years = parseInt(getYearsSinceDOB(doc), 10);
  if (!isNaN(years)) {
    return reportedDate.subtract(years, 'years');
  }
  const months = parseInt(getMonthsSinceDOB(doc), 10);
  if (!isNaN(months)) {
    return reportedDate.subtract(months, 'months');
  }
  const weeks = parseInt(getWeeksSinceDOB(doc), 10);
  if (!isNaN(weeks)) {
    return reportedDate.subtract(weeks, 'weeks');
  }
  const days = parseInt(getDaysSinceDOB(doc), 10);
  if (!isNaN(days)) {
    return reportedDate.subtract(days, 'days');
  }
  // no given date of birth - return reportedDate as it's the best we can do
  return reportedDate;
};

const setBirthDate = doc => {
  const dob = getDOB(doc);
  if (dob) {
    doc.birth_date = dob.toISOString();
  }
};

// NB: this is very similar to a function in accept_patient_reports, except
//     we also allow for an empty event_type
const messageRelevant = (msg, doc) => {
  if (!msg.event_type || msg.event_type === 'report_accepted') {
    const expr = msg.bool_expr;
    if (utils.isNonEmptyString(expr)) {
      return utils.evalExpression(expr, { doc: doc });
    } else {
      return true;
    }
  }
};

const assignSchedule = (options) => {
  const patientId = options.doc.fields && options.doc.fields.patient_id;

  return getRegistrations(patientId).then(registrations => {
    options.params.forEach(scheduleName => {
      const schedule = schedules.getScheduleConfig(scheduleName);
      schedules.assignSchedule(
        options.doc,
        schedule,
        registrations,
        options.doc.patient
      );
    });
  });
};

const addMessages = (config, doc) => {
  const patientId = doc.fields && doc.fields.patient_id;
  if (!config.messages || !config.messages.length) {
    return;
  }

  return getRegistrations(patientId).then(registrations => {
    const context = {
      patient: doc.patient,
      registrations: registrations,
      templateContext: {
        next_msg: schedules.getNextTimes(doc, moment(date.getDate())),
      },
    };
    config.messages.forEach(msg => {
      if (messageRelevant(msg, doc)) {
        messages.addMessage(doc, msg, msg.recipient, context);
      }
    });
  });
};

const setId = (options) => {
  const doc = options.doc;
  const patientIdField = options.params.patient_id_field;

  if (patientIdField) {
    const providedId = doc.fields[options.params.patient_id_field];

    if (!providedId) {
      transitionUtils.addRejectionMessage(doc, options.registrationConfig, 'no_provided_patient_id');
      return Promise.resolve();
    }

    return transitionUtils
      .isIdUnique(providedId)
      .then(isUnique => {
        if (!isUnique) {
          transitionUtils.addRejectionMessage(doc, options.registrationConfig, 'provided_patient_id_not_unique');
          return;
        }

        doc.patient_id = providedId;
      });
  } else {
    return transitionUtils
      .getUniqueId()
      .then(uniqueId => {
        doc.patient_id = uniqueId;
        return;
      });
  }
};

const addPatient = (options) => {
  const doc = options.doc,
        patientShortcode = doc.patient_id,
        patientNameField = getPatientNameField(options.params);

  return utils
    .getPatientContactUuid(patientShortcode)
    .then(patientContactId => {
      if (patientContactId) {
        return;
      }

      return db.medic
        .query('medic-client/contacts_by_phone', { key: doc.from, include_docs: true })
        .then(result => {
          const contact = result && result.rows && result.rows[0] && result.rows[0].doc;
          lineage.minify(contact);

          const patient = {
            name: doc.fields[patientNameField],
            created_by: contact && contact._id,
            parent: contact && contact.parent,
            reported_date: doc.reported_date,
            patient_id: patientShortcode,
            source_id: doc._id,
          };
          if (options.params.contact_type) {
            patient.type = 'contact';
            patient.contact_type = options.params.contact_type;
          } else {
            patient.type = 'person';
          }
          // include the DOB if it was generated on report
          if (doc.birth_date) {
            patient.date_of_birth = doc.birth_date;
          }
          return db.medic.post(patient);
        });
    });

};

/*
 * Given a doc get the LMP value as a number, including 0.  Supports three
 * property names atm.
 * */
const getWeeksSinceLMP = doc => {
  const props = ['weeks_since_lmp', 'last_menstrual_period', 'lmp'];
  let ret;
  props.forEach(prop => {
    if (_.isNumber(ret) && !_.isNaN(ret)) {
      return;
    }
    const val = Number(doc.fields && doc.fields[prop]);
    if (_.isNumber(val)) {
      ret = val;
    }
  });
  return ret;
};

const setExpectedBirthDate = doc => {
  const lmp = Number(getWeeksSinceLMP(doc)),
        start = moment(doc.reported_date).startOf('day');
  if (lmp === 0) {
    // means baby was already born, chw just wants a registration.
    doc.lmp_date = null;
    doc.expected_date = null;
  } else {
    start.subtract(lmp, 'weeks');
    doc.lmp_date = start.toISOString();
    doc.expected_date = start
      .clone()
      .add(40, 'weeks')
      .toISOString();
  }
};

const validate = (config, doc) => {
  const validations = config && config.validations && config.validations.list;
  return new Promise(resolve => validation.validate(doc, validations, resolve));
};

const getYearsSinceDOB = doc => {
  const fields = ['years_since_dob', 'years_since_birth', 'age_in_years'];
  return findFirstDefinedValue(doc, fields);
};

const getMonthsSinceDOB = doc => {
  const fields = ['months_since_dob', 'months_since_birth', 'age_in_months'];
  return findFirstDefinedValue(doc, fields);
};

const getWeeksSinceDOB = doc => {
  const fields = [
    'weeks_since_dob',
    'dob',
    'weeks_since_birth',
    'age_in_weeks',
  ];
  return findFirstDefinedValue(doc, fields);
};

const getDaysSinceDOB = doc => {
  const fields = ['days_since_dob', 'days_since_birth', 'age_in_days'];
  return findFirstDefinedValue(doc, fields);
};

const getConfig = () => config.get('registrations');

/*
 * Given a form code and config array, return config for that form.
 * */
const getRegistrationConfig = (config, form_code) => {
  return config.find(conf => utils.isFormCodeSame(form_code, conf.form));
};

const triggers = {
  add_patient: (options) => {
    // if we already have a patient id then return
    if (options.doc.patient_id) {
      return;
    }

    return setId(options).then(() => addPatient(options));
  },
  add_patient_id: (options) => {
    // Deprecated name for add_patient
    logger.warn('Use of add_patient_id trigger. This is deprecated in favour of add_patient.');
    return triggers.add_patient(options);
  },
  add_expected_date: (options) => {
    setExpectedBirthDate(options.doc);
  },
  add_birth_date: (options) => {
    setBirthDate(options.doc);
  },
  assign_schedule: (options) => {
    assignSchedule(options);
  },
  clear_schedule: (options) => {
    // Registration forms that clear schedules do so fully
    // silence_type will be split again later, so join them back
    const config = {
      silence_type: options.params.join(','),
      silence_for: null,
    };

    return utils
      .getReportsBySubject({
        ids: utils.getSubjectIds(options.doc.patient),
        registrations: true
      })
      .then(registrations => {
        return new Promise((resolve, reject) => {
          acceptPatientReports.silenceRegistrations(
            config,
            options.doc,
            registrations,
            (err, result) => err ? reject(err) : resolve(result)
          );
        });
      });
  },
};

const fireConfiguredTriggers = (registrationConfig, doc) => {
  const promises = registrationConfig.events
    .map(event => {
      const trigger = triggers[event.trigger];
      if (!trigger || event.name !== 'on_create') {
        return;
      }

      const obj = Object.assign({}, doc.fields, doc);
      if (booleanExpressionFails(obj, event.bool_expr)) {
        return;
      }

      const options = {
        doc: doc,
        registrationConfig: registrationConfig,
        params: parseParams(event.params),
      };
      logger.debug(`Parsed params for form "${options.form}", trigger "${event.trigger}, params: ${options.params}"`);
      return () => trigger(options);
    })
    .filter(item => !!item);

  return promises
    .reduce((promise, triggerFn) => promise.then(triggerFn), Promise.resolve())
    .then(() => addMessages(registrationConfig, doc))
    .then(() => true);
};

module.exports = {
  init: () => {
    const registrations = getConfig();
    registrations.forEach(registration => {
      if (registration.events) {
        registration.events.forEach(event => {
          let params;
          try {
            params = parseParams(event.params);
          } catch (e) {
            throw new Error(`Configuration error. Unable to parse params for ${registration.form}.${event.trigger}: '${event.params}'. Error: ${e}`);
          }
          if (event.trigger === 'add_patient') {
            if (params.patient_id_field === 'patient_id') {
              throw new Error(`Configuration error in ${registration.form}.${event.trigger}: patient_id_field cannot be set to patient_id`);
            }
            const contactTypes = config.get('contact_types') || [];
            const typeId = params.contact_type || 'person';
            const contactType = contactTypes.find(type => type.id === typeId);
            if (!contactType) {
              throw new Error(`Configuration error in ${registration.form}.${event.trigger}: trigger would create a doc with an unknown contact type "${typeId}"`);
            }
            if (!contactType.person) {
              throw new Error(`Configuration error in ${registration.form}.${event.trigger}: trigger would create a doc with a place contact type "${typeId}"`);
            }
          }
          if (
            event.trigger === 'assign_schedule' ||
            event.trigger === 'clear_schedule'
          ) {
            if (!event.params) {
              throw new Error(`Configuration error. Expecting params to be defined as the name of the schedule(s) for ${registration.form}.${event.trigger}`);
            }
            if (!Array.isArray(params)) {
              throw new Error(`Configuration error. Expecting params to be a string, comma separated list, or an array for ${registration.form}.${event.trigger}: '${event.params}'`);
            }
          }
        });
      }
    });
  },
  filter: (doc, info = {}) => {
    return Boolean(
      doc.type === 'data_record' &&
      getRegistrationConfig(getConfig(), doc.form) &&
      !transitionUtils.hasRun(info, NAME) &&
      utils.isValidSubmission(doc) // requires either an xform, a known submitter or public form for SMS
    );
  },
  onMatch: change => {
    const doc = change.doc;
    const registrationConfig = getRegistrationConfig(getConfig(), doc.form);

    return validate(registrationConfig, doc)
      .then(errors => {
        if (errors && errors.length > 0) {
          messages.addErrors(registrationConfig, doc, errors, { patient: doc.patient });
          return true;
        }

        const patientId = doc.fields && doc.fields.patient_id;

        if (!patientId) {
          return fireConfiguredTriggers(registrationConfig, doc);
        }

        // We're attaching this registration to an existing patient, let's
        // make sure it's valid
        return utils.getPatientContactUuid(patientId).then(patientContactId => {
          if (!patientContactId) {
            transitionUtils.addRegistrationNotFoundError(doc, registrationConfig);
            return true;
          }

          return fireConfiguredTriggers(registrationConfig, doc);
        });
      });
  },
};
