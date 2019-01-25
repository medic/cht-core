const _ = require('underscore'),
  async = require('async'),
  utils = require('../lib/utils'),
  transitionUtils = require('./utils'),
  logger = require('../lib/logger'),
  dbPouch = require('../db-pouch'),
  lineage = require('@medic/lineage')(Promise, dbPouch.medic),
  messages = require('../lib/messages'),
  validation = require('../lib/validation'),
  schedules = require('../lib/schedules'),
  acceptPatientReports = require('./accept_patient_reports'),
  moment = require('moment'),
  config = require('../config'),
  date = require('../date'),
  db = require('../db-nano'),
  NAME = 'registration',
  XFORM_CONTENT_TYPE = 'xml';

const findFirstDefinedValue = (doc, fields) => {
  const definedField = _.find(fields, field => {
    return !_.isUndefined(doc.fields[field]) && !_.isNull(doc.fields[field]);
  });
  return definedField && doc.fields[definedField];
};

const getRegistrations = (patientId, callback) => {
  if (!patientId) {
    return callback();
  }
  utils.getRegistrations({ id: patientId }, callback);
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

module.exports = {
  init: () => {
    const configs = module.exports.getConfig();
    configs.forEach(config => {
      if (config.events) {
        config.events.forEach(event => {
          let params;
          try {
            params = parseParams(event.params);
          } catch (e) {
            throw new Error(
              `Configuration error. Unable to parse params for ${config.form}.${
                event.trigger
              }: '${event.params}'. Error: ${e}`
            );
          }
          if (
            event.trigger === 'add_patient' &&
            params.patient_id_field === 'patient_id'
          ) {
            throw new Error(
              'Configuration error. patient_id_field cannot be set to patient_id'
            );
          }
          if (
            event.trigger === 'assign_schedule' ||
            event.trigger === 'clear_schedule'
          ) {
            if (!event.params) {
              throw new Error(
                `Configuration error. Expecting params to be defined as the name of the schedule(s) for ${
                  config.form
                }.${event.trigger}`
              );
            }
            if (!_.isArray(params)) {
              throw new Error(
                `Configuration error. Expecting params to be a string, comma separated list, or an array for ${
                  config.form
                }.${event.trigger}: '${event.params}'`
              );
            }
          }
        });
      }
    });
  },
  filter: (doc, info = {}) => {
    const self = module.exports,
      form = utils.getForm(doc && doc.form);
    return Boolean(
      doc.type === 'data_record' &&
        self.getRegistrationConfig(self.getConfig(), doc.form) &&
        !transitionUtils.hasRun(info, NAME) &&
        ((doc && doc.content_type === XFORM_CONTENT_TYPE) || // xform submission
        (form && utils.getClinicPhone(doc)) || // json submission by known submitter
          (form && form.public_form)) // json submission to public form
    );
  },
  getDOB: doc => {
    if (!doc || !doc.fields) {
      return '';
    }
    const today = moment(date.getDate()).startOf('day');
    const years = parseInt(module.exports.getYearsSinceDOB(doc), 10);
    if (!isNaN(years)) {
      return today.subtract(years, 'years');
    }
    const months = parseInt(module.exports.getMonthsSinceDOB(doc), 10);
    if (!isNaN(months)) {
      return today.subtract(months, 'months');
    }
    const weeks = parseInt(module.exports.getWeeksSinceDOB(doc), 10);
    if (!isNaN(weeks)) {
      return today.subtract(weeks, 'weeks');
    }
    const days = parseInt(module.exports.getDaysSinceDOB(doc), 10);
    if (!isNaN(days)) {
      return today.subtract(days, 'days');
    }
    // no given date of birth - return today as it's the best we can do
    return today;
  },
  getYearsSinceDOB: doc => {
    const fields = ['years_since_dob', 'years_since_birth', 'age_in_years'];
    return findFirstDefinedValue(doc, fields);
  },
  getMonthsSinceDOB: doc => {
    const fields = ['months_since_dob', 'months_since_birth', 'age_in_months'];
    return findFirstDefinedValue(doc, fields);
  },
  getWeeksSinceDOB: doc => {
    const fields = [
      'weeks_since_dob',
      'dob',
      'weeks_since_birth',
      'age_in_weeks',
    ];
    return findFirstDefinedValue(doc, fields);
  },
  getDaysSinceDOB: doc => {
    const fields = ['days_since_dob', 'days_since_birth', 'age_in_days'];
    return findFirstDefinedValue(doc, fields);
  },
  /*
   * Given a doc get the LMP value as a number, including 0.  Supports three
   * property names atm.
   * */
  getWeeksSinceLMP: doc => {
    const props = ['weeks_since_lmp', 'last_menstrual_period', 'lmp'];
    let ret;
    let val;
    _.each(props, prop => {
      if (_.isNumber(ret) && !_.isNaN(ret)) {
        return;
      }
      val = Number(doc.fields && doc.fields[prop]);
      if (_.isNumber(val)) {
        ret = val;
      }
    });
    return ret;
  },
  isIdOnly: doc => {
    /* if true skip schedule creation */
    return Boolean(doc.getid || doc.skip_schedule_creation);
  },
  setExpectedBirthDate: doc => {
    const lmp = Number(module.exports.getWeeksSinceLMP(doc)),
      start = moment(date.getDate()).startOf('day');
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
  },
  setBirthDate: doc => {
    const dob = module.exports.getDOB(doc);
    if (dob) {
      doc.birth_date = dob.toISOString();
    }
  },
  getConfig: () => {
    return config.get('registrations');
  },
  /*
   * Given a form code and config array, return config for that form.
   * */
  getRegistrationConfig: (config, form_code) => {
    return _.find(config, conf => utils.isFormCodeSame(form_code, conf.form));
  },
  validate: (config, doc, callback) => {
    const validations = config.validations && config.validations.list;
    return validation.validate(doc, validations, callback);
  },
  onMatch: change => {
    const self = module.exports,
      doc = change.doc,
      registrationConfig = self.getRegistrationConfig(
        self.getConfig(),
        doc.form
      );

    return new Promise((resolve, reject) => {
      self.validate(registrationConfig, doc, errors => {
        if (errors && errors.length > 0) {
          messages.addErrors(registrationConfig, doc, errors, {
            patient: doc.patient,
          });
          return resolve(true);
        }

        const patientId = doc.fields && doc.fields.patient_id;

        if (!patientId) {
          return self
            .fireConfiguredTriggers(registrationConfig, doc)
            .then(resolve)
            .catch(reject);
        }

        // We're attaching this registration to an existing patient, let's
        // make sure it's valid
        return utils.getPatientContactUuid(
          patientId,
          (err, patientContactId) => {
            if (err) {
              return reject(err);
            }

            if (!patientContactId) {
              transitionUtils.addRegistrationNotFoundError(
                doc,
                registrationConfig
              );
              return resolve(true);
            }
            return self
              .fireConfiguredTriggers(registrationConfig, doc)
              .then(resolve)
              .catch(reject);
          }
        );
      });
    });
  },
  fireConfiguredTriggers: (registrationConfig, doc) => {
    const self = module.exports;

    return new Promise((resolve, reject) => {
      const series = registrationConfig.events
        .map(event => cb => {
          const trigger = self.triggers[event.trigger];
          if (!trigger || event.name !== 'on_create') {
            return cb();
          }
          const obj = _.defaults({}, doc, doc.fields);

          if (booleanExpressionFails(obj, event.bool_expr)) {
            return cb();
          }

          const options = {
            doc: doc,
            registrationConfig: registrationConfig,
            params: parseParams(event.params),
          };
          logger.debug(
            `Parsed params for form "${options.form}", trigger "${
              event.trigger
            }, params: ${options.params}"`
          );
          trigger.apply(null, [options, cb]);
        })
        .filter(item => !!item);

      async.series(series, err => {
        if (err) {
          return reject(err);
        }

        // add messages is done last so data on doc can be used in
        // messages
        self.addMessages(registrationConfig, doc, () => {
          resolve(true);
        });
      });
    });
  },
  triggers: {
    add_patient: (options, cb) => {
      // if we already have a patient id then return
      if (options.doc.patient_id) {
        return cb();
      }
      async.series(
        [
          _.partial(module.exports.setId, options),
          _.partial(module.exports.addPatient, options),
        ],
        cb
      );
    },
    add_patient_id: (options, cb) => {
      // Deprecated name for add_patient
      logger.warn(
        'Use of add_patient_id trigger. This is deprecated in favour of add_patient.'
      );
      module.exports.triggers.add_patient(options, cb);
    },
    add_expected_date: (options, cb) => {
      module.exports.setExpectedBirthDate(options.doc);
      cb();
    },
    add_birth_date: (options, cb) => {
      module.exports.setBirthDate(options.doc);
      cb();
    },
    assign_schedule: (options, cb) => {
      module.exports.assignSchedule(options, cb);
    },
    clear_schedule: (options, cb) => {
      // Registration forms that clear schedules do so fully
      // silence_type will be split again later, so join them back
      const config = {
        silence_type: options.params.join(','),
        silence_for: null,
      };

      utils
        .getReportsBySubject({
          ids: utils.getSubjectIds(options.doc.patient),
          registrations: true
        })
        .then(registrations => {
          acceptPatientReports.silenceRegistrations(
            config,
            options.doc,
            registrations,
            cb
          );
        })
        .catch(cb);
    },
  },
  addMessages: (config, doc, callback) => {
    const patientId = doc.fields && doc.fields.patient_id;
    if (!config.messages || !config.messages.length) {
      return callback();
    }

    getRegistrations(patientId, (err, registrations) => {
      if (err) {
        return callback(err);
      }
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
      callback();
    });
  },
  assignSchedule: (options, callback) => {
    const patientId = options.doc.fields && options.doc.fields.patient_id;

    getRegistrations(patientId, (err, registrations) => {
      if (err) {
        return callback(err);
      }
      options.params.forEach(scheduleName => {
        const schedule = schedules.getScheduleConfig(scheduleName);
        schedules.assignSchedule(
          options.doc,
          schedule,
          registrations,
          options.doc.patient
        );
      });
      callback();
    });
  },
  setId: (options, callback) => {
    const doc = options.doc,
      patientIdField = options.params.patient_id_field;

    if (patientIdField) {
      const providedId = doc.fields[options.params.patient_id_field];

      if (!providedId) {
        transitionUtils.addRejectionMessage(
          doc,
          options.registrationConfig,
          'no_provided_patient_id'
        );
        return callback(null, true);
      }

      transitionUtils.isIdUnique(db, providedId, (err, isUnique) => {
        if (err) {
          return callback(err);
        }

        if (isUnique) {
          doc.patient_id = providedId;
          return callback();
        }

        transitionUtils.addRejectionMessage(
          doc,
          options.registrationConfig,
          'provided_patient_id_not_unique'
        );
        callback(null, true);
      });
    } else {
      transitionUtils.addUniqueId(doc, callback);
    }
  },
  addPatient: (options, callback) => {
    const doc = options.doc,
      patientShortcode = doc.patient_id,
      patientNameField = getPatientNameField(options.params);

    utils.getPatientContactUuid(
      patientShortcode,
      (err, patientContactId) => {
        if (err) {
          return callback(err);
        }

        if (patientContactId) {
          return callback();
        }

        db.medic.view(
          'medic-client',
          'contacts_by_phone',
          {
            key: doc.from,
            include_docs: true,
          },
          (err, result) => {
            if (err) {
              return callback(err);
            }
            const contact = _.result(_.first(result.rows), 'doc');
            lineage.minify(contact);
            // create a new patient with this patient_id
            const patient = {
              name: doc.fields[patientNameField],
              created_by: contact && contact._id,
              parent: contact && contact.parent,
              reported_date: doc.reported_date,
              type: 'person',
              patient_id: patientShortcode,
              source_id: doc._id,
            };
            // include the DOB if it was generated on report
            if (doc.birth_date) {
              patient.date_of_birth = doc.birth_date;
            }
            dbPouch.medic.post(patient, callback);
          }
        );
      }
    );
  },
  _booleanExpressionFails: booleanExpressionFails,
  _lineage: lineage,
};
