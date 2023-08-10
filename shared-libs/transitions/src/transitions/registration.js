const _ = require('lodash');
const utils = require('../lib/utils');
const transitionUtils = require('./utils');
const logger = require('../lib/logger');
const db = require('../db');
const lineage = require('@medic/lineage')(Promise, db.medic);
const messages = require('../lib/messages');
const schedules = require('../lib/schedules');
const acceptPatientReports = require('./accept_patient_reports');
const moment = require('moment');
const config = require('../config');
const date = require('../date');
const phoneNumberParser = require('@medic/phone-number');

const contactTypesUtils = require('@medic/contact-types-utils');

const NAME = 'registration';
const PARENT_NOT_FOUND = 'parent_not_found';
const PARENT_FIELD_NOT_PROVIDED = 'parent_field_not_provided';
const PARENT_INVALID = 'parent_invalid';

const findFirstDefinedValue = (doc, fields) => {
  const definedField = fields.find(field => doc.fields[field] !== undefined && doc.fields[field] !== null);
  return definedField && doc.fields[definedField];
};

const getPatientNameField = (params) => getNameField(params, 'patient');
const getPlaceNameField = (params) => getNameField(params, 'place');

const getNameField = (params, prefix) => {
  if (Array.isArray(params) && params.length && params[0]) {
    return params[0];
  }

  const nameField = `${prefix}_name_field`;
  if (params && params[nameField]) {
    return params[nameField];
  }

  const defaultNameField = `${prefix}_name`;
  return defaultNameField;
};

const getPatientPhoneField = (currentForm) => {
  const formDef = utils.getForm(currentForm);
  if (!formDef?.fields) {
    return;
  }
  
  return Object
    .keys(formDef.fields)
    .find(key => formDef.fields[key].type === 'phone_number'); 
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

/*
 * Given a doc get the LMP value as a number, including 0. Supports three
 * property names atm.
 */
const getWeeksSinceLMP = doc => {
  const props = ['weeks_since_lmp', 'last_menstrual_period', 'lmp'];
  for (const prop of props) {
    const lmp = Number(doc.fields && doc.fields[prop]);
    if (!isNaN(lmp)) {
      return lmp;
    }
  }
};

/*
* Given a doc, try to get the exact LMP date
*/
const getLMPDate = doc => {
  const props = ['lmp_date', 'date_lmp'];
  for (const prop of props) {
    const lmp = doc.fields && doc.fields[prop] && parseInt(doc.fields[prop]);
    if (!isNaN(lmp)) {//milliseconds since epoch
      return lmp;
    }
  }
};

const setExpectedBirthDate = doc => {
  let start;
  const lmpDate = getLMPDate(doc);
  if (lmpDate) {
    start = moment(lmpDate);
  } else {
    const lmp = getWeeksSinceLMP(doc);
    if (lmp) {
      start = moment(doc.reported_date).startOf('day');
      start.subtract(lmp, 'weeks');
    }
  }

  if (!start) {// means baby was already born, chw just wants a registration.
    doc.lmp_date = null;
    doc.expected_date = null;
    return;
  }

  doc.lmp_date = start.toISOString();
  doc.expected_date = start
    .clone()
    .add(40, 'weeks')
    .toISOString();
};

const setBirthDate = doc => {
  const dob = getDOB(doc);
  if (dob) {
    doc.birth_date = dob.toISOString();
  }
};

const getConfig = () => config.get('registrations');

/*
 * Given a form code and config array, return config for that form.
 */
const getRegistrationConfig = (config, formCode) => {
  return config.find(conf => utils.isFormCodeSame(formCode, conf.form));
};

const triggers = {
  add_patient: (options) => {
    // if we already have a patient id then return
    if (options.doc.patient_id) {
      return;
    }

    return setPatientId(options).then(() => addPatient(options));
  },
  add_place: (options) => {
    // if we already have a place id then return
    if (options.doc.place_id) {
      return;
    }

    return setPlaceId(options).then(() => addPlace(options));
  },
  add_case: (options) => {
    return setCaseId(options).then(() => addPlaceId(options));
  },
  add_patient_id: (options) => {
    // Deprecated name for add_patient
    logger.warn('Use of add_patient_id trigger. This is deprecated in favour of add_patient.');
    return triggers.add_patient(options);
  },
  add_expected_date: (options) => {
    return setExpectedBirthDate(options.doc);
  },
  add_birth_date: (options) => {
    return setBirthDate(options.doc);
  },
  assign_schedule: (options) => {
    return assignSchedule(options);
  },
  clear_schedule: (options) => {
    // Registration forms that clear schedules do so fully
    // silence_type will be split again later, so join them back
    const config = {
      silence_type: options.params.join(','),
      silence_for: null,
    };

    const subjectIds = [
      ...utils.getSubjectIds(options.doc.patient),
      ...utils.getSubjectIds(options.doc.place),
    ];
    const caseId = options.doc.case_id ||
      (options.doc.fields && options.doc.fields.case_id);
    if (caseId) {
      subjectIds.push(caseId);
    }

    return utils
      .getReportsBySubject({ ids: subjectIds, registrations: true })
      .then(registrations => acceptPatientReports.silenceRegistrations(config, options.doc, registrations));
  },
};

const fireConfiguredTriggers = (registrationConfig, doc) => {
  const promises = registrationConfig.events
    .map(event => {
      const trigger = triggers[event.trigger];
      if (!trigger || event.name !== 'on_create') {
        return;
      }

      const obj = _.defaults({}, doc, doc.fields);

      if (booleanExpressionFails(obj, event.bool_expr)) {
        return;
      }

      const options = {
        doc,
        registrationConfig,
        params: parseParams(event.params),
      };
      logger.debug(
        `Parsed params for form "${registrationConfig.form}", trigger "${event.trigger}, params: ${options.params}"`
      );
      return () => trigger(options);
    })
    .filter(item => !!item);

  return promises
    .reduce((promise, trigger) => promise.then(trigger), Promise.resolve())
    .then(() => addMessages(registrationConfig, doc))
    .then(() => true);
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

const addMessages = (config, doc) => {
  const patientId = doc.fields && doc.fields.patient_id;
  const placeId = doc.fields && doc.fields.place_id;
  if (!config.messages || !config.messages.length) {
    return;
  }

  return Promise
    .all([
      utils.getRegistrations({ id: patientId }),
      utils.getRegistrations({ id: placeId }),
    ])
    .then(([patientRegistrations, placeRegistrations]) => {
      const context = {
        patient: doc.patient,
        place: doc.place,
        registrations: patientRegistrations,
        placeRegistrations: placeRegistrations,
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

const assignSchedule = (options) => {
  const patientId = options.doc.fields && options.doc.fields.patient_id;
  const placeId = options.doc.fields && options.doc.fields.place_id;

  return Promise
    .all([
      utils.getRegistrations({ id: patientId }),
      utils.getRegistrations({ id: placeId }),
    ])
    .then(([patientRegistrations, placeRegistrations]) => {
      options.params.forEach(scheduleName => {
        const schedule = schedules.getScheduleConfig(scheduleName);
        const context = {
          patientRegistrations,
          patient: options.doc.patient,
          placeRegistrations,
          place: options.doc.place
        };
        schedules.assignSchedule(options.doc, schedule, context);
      });
    });
};

const generateId = (doc, key) => {
  return transitionUtils.getUniqueId().then(id => doc[key] = id);
};

const setPlaceId = ({ doc }) => generateId(doc, 'place_id');
const setCaseId = ({ doc }) => {
  if (doc.case_id) {
    return Promise.resolve();
  }
  return generateId(doc, 'case_id');
};

const addPlaceId = ({ doc }) => {
  const placeId = doc.contact && doc.contact.parent && doc.contact.parent._id;
  if (!placeId) {
    return;
  }
  if (!doc.fields) {
    doc.fields = {};
  }
  doc.fields.place_uuid = placeId;
};

const setPatientId = (options) => {
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
        if (isUnique) {
          doc.patient_id = providedId;
          return;
        }

        transitionUtils.addRejectionMessage(doc, options.registrationConfig, 'provided_patient_id_not_unique');
      });
  } else {
    return generateId(doc, 'patient_id');
  }
};

const getParentByPhone = options => {
  return db.medic
    .query('medic-client/contacts_by_phone', { key: options.doc.from, include_docs: true })
    .then(result => result && result.rows && result.rows.length && result.rows[0].doc)
    .then(contact => {
      if (!contact) {
        return;
      }

      options.doc.contact = contact;
      return contact.parent && db.medic.get(contact.parent._id);
    });
};

// returns the parent of the contact to be created (place or patient)
const getParent = options => {
  // if the `parent_id` fields name is not specified in the trigger, default to the submitter's parent
  if (!options.params.parent_id) {
    // if `update_clinics` runs, the `contact` property already exists
    if (options.doc.contact && options.doc.contact.parent) {
      return Promise.resolve(JSON.parse(JSON.stringify(options.doc.contact.parent)));
    }

    // when `update_clinics` is not enabled (for some reason), fallback to getting contact by phone
    return getParentByPhone(options).then(parent => {
      if (!parent) {
        transitionUtils.addRejectionMessage(options.doc, options.registrationConfig, PARENT_NOT_FOUND);
        return;
      }

      return parent;
    });
  }

  // if the `parent_id` field name is specified in the trigger, but is not defined in the doc, add an error
  if (!options.doc.fields[options.params.parent_id]) {
    transitionUtils.addRejectionMessage(options.doc, options.registrationConfig, PARENT_FIELD_NOT_PROVIDED);
    return Promise.resolve();
  }

  return utils.getContact(options.doc.fields[options.params.parent_id]).then(parent => {
    if (!parent) {
      transitionUtils.addRejectionMessage(options.doc, options.registrationConfig, PARENT_NOT_FOUND);
      return;
    }

    return parent;
  });
};

const isValidParent = (parent, child) => {
  const parentType = contactTypesUtils.getContactType(config.getAll(), parent);
  const childType = contactTypesUtils.getContactType(config.getAll(), child);
  return contactTypesUtils.isParentOf(parentType, childType);
};

const addPatient = (options) => {
  const doc = options.doc;
  const patientShortcode = options.doc.patient_id;
  const patientNameField = getPatientNameField(options.params);
  const patientPhoneField = getPatientPhoneField(doc.form);

  // create a new patient with this patient_id
  const patient = {
    name: doc.fields[patientNameField],
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



  return utils
    .getContactUuid(patientShortcode)
    .then(patientContactId => {
      if (patientContactId) {
        doc.patient_id = patientShortcode;
        return;
      }

      return getParent(options).then(parent => {
        if (!parent) {
          return;
        }

        if (!isValidParent(parent, patient)) {
          transitionUtils.addRejectionMessage(
            options.doc,
            options.registrationConfig,
            PARENT_INVALID,
            { templateContext: { parent } }
          );
          return;
        }

        // include the DOB if it was generated on report
        if (doc.birth_date) {
          patient.date_of_birth = doc.birth_date;
        }

        if (patientPhoneField && doc.fields[patientPhoneField]) {
          const patientPhone = doc.fields[patientPhoneField];
          if (!phoneNumberParser.validate(config.getAll(), patientPhone)) {
            transitionUtils.addRejectionMessage(doc, options.registrationConfig, 'provided_phone_not_valid');
            return;
          }
          patient.phone = doc.fields[patientPhoneField];
        }

        // assign patient in doc with full parent doc - to be used in messages
        doc.patient = Object.assign({ parent }, patient);
        patient.parent = lineage.minifyLineage(parent);
        patient.created_by = doc.contact && doc.contact._id;

        return db.medic.post(patient);
      });
    });
};

const addPlace = (options) => {
  const doc = options.doc;
  const placeShortcode = doc.place_id;
  const placeNameField = getPlaceNameField(options.params);

  // create a new place with this place_id
  const place = {
    name: doc.fields[placeNameField],
    reported_date: doc.reported_date,
    place_id: placeShortcode,
    source_id: doc._id,
  };

  if (contactTypesUtils.isHardcodedType(options.params.contact_type)) {
    place.type = options.params.contact_type;
  } else {
    place.type = 'contact';
    place.contact_type = options.params.contact_type;
  }

  return utils
    .getContactUuid(placeShortcode)
    .then(placeContactId => {
      if (placeContactId) {
        doc.place_id = placeShortcode;
        return;
      }

      return getParent(options).then(parent => {
        if (!parent) {
          return;
        }

        if (!isValidParent(parent, place)) {
          transitionUtils.addRejectionMessage(
            options.doc,
            options.registrationConfig,
            PARENT_INVALID,
            { templateContext: { parent } }
          );
          return;
        }

        // assign place in doc with full parent doc - to be used in messages
        doc.place = Object.assign({ parent }, place);
        place.parent = lineage.minifyLineage(parent);
        place.created_by = doc.contact && doc.contact._id;

        return db.medic.post(place);
      });
    });
};

const hasValidSubject = (doc, patientId, placeId) => {
  // doc is already hydrated.
  if (patientId && (!doc.patient || (doc.patient && !contactTypesUtils.isPerson(config.getAll(), doc.patient)))) {
    return false;
  }

  if (placeId && (!doc.place || (doc.place && !contactTypesUtils.isPlace(config.getAll(), doc.place)))) {
    return false;
  }

  return true;
};

module.exports = {
  name: NAME,
  init: () => {
    const registrations = getConfig();
    registrations.forEach(registration => {
      if (registration.events) {
        registration.events.forEach(event => {
          let params;
          try {
            params = parseParams(event.params);
          } catch (e) {
            throw new Error(
              `Configuration error. Unable to parse params for ${registration.form}.${event.trigger}: ` +
              `'${event.params}'. Error: ${e}`
            );
          }

          if (event.trigger === 'add_patient') {
            if (params.patient_id_field === 'patient_id') {
              throw new Error(
                `Configuration error in ${registration.form}.${event.trigger}: ` +
                `patient_id_field cannot be set to patient_id`
              );
            }
            const typeId = params.contact_type || 'person';
            const contactType = contactTypesUtils.getTypeById(config.getAll(), typeId);
            if (!contactType) {
              throw new Error(
                `Configuration error in ${registration.form}.${event.trigger}: ` +
                `trigger would create a doc with an unknown contact type "${typeId}"`
              );
            }
            if (!contactTypesUtils.isPersonType(contactType)) {
              throw new Error(
                `Configuration error in ${registration.form}.${event.trigger}: ` +
                `trigger would create a person with a place contact type "${typeId}"`
              );
            }
          }

          if (
            event.trigger === 'assign_schedule' ||
            event.trigger === 'clear_schedule'
          ) {
            if (!event.params) {
              throw new Error(
                `Configuration error. Expecting params to be defined as the name of the schedule(s) ` +
                `for ${registration.form}.${event.trigger}`
              );
            }
            if (!Array.isArray(params)) {
              throw new Error(
                `Configuration error. Expecting params to be a string, comma separated list, ` +
                `or an array for ${registration.form}.${event.trigger}: '${event.params}'
              `);
            }
          }

          if (event.trigger === 'add_place') {
            const typeId = params.contact_type;
            if (!typeId) {
              throw new Error(
                `Configuration error in ${registration.form}.${event.trigger}: ` +
                `trigger would create a place with an undefined contact type`
              );
            }
            const contactType = contactTypesUtils.getTypeById(config.getAll(), typeId);
            if (!contactType) {
              throw new Error(
                `Configuration error in ${registration.form}.${event.trigger}: ` +
                `trigger would create a place with an unknown contact type "${typeId}"`
              );
            }
            if (!contactTypesUtils.isPlaceType(contactType)) {
              throw new Error(
                `Configuration error in ${registration.form}.${event.trigger}: ` +
                `trigger would create a place with a person contact type "${typeId}"`
              );
            }
          }
        });
      }
    });
  },
  filter: ({ doc, info }) => {
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

    return transitionUtils
      .validate(registrationConfig, doc)
      .then(errors => {
        if (errors && errors.length > 0) {
          messages.addErrors(registrationConfig, doc, errors, { patient: doc.patient, place: doc.place });
          return true;
        }

        const patientId = doc.fields && doc.fields.patient_id;
        const placeId = doc.fields && doc.fields.place_id;

        if (!patientId && !placeId) {
          return fireConfiguredTriggers(registrationConfig, doc);
        }

        // We're attaching this registration to an existing contact, let's
        // make sure it's valid
        if (!hasValidSubject(doc, patientId, placeId)) {
          transitionUtils.addRegistrationNotFoundError(doc, registrationConfig);
          return true;
        }

        return fireConfiguredTriggers(registrationConfig, doc);
      });
  },
};
