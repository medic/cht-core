var vm = require('vm'),
    _ = require('underscore'),
    async = require('async'),
    utils = require('../lib/utils'),
    transitionUtils = require('./utils'),
    logger = require('../lib/logger'),
    messages = require('../lib/messages'),
    validation = require('../lib/validation'),
    schedules = require('../lib/schedules'),
    acceptPatientReports = require('./accept_patient_reports'),
    moment = require('moment'),
    config = require('../config'),
    date = require('../date'),
    XFORM_CONTENT_TYPE = 'xml';

var findFirstDefinedValue = function(doc, fields) {
    var definedField = _.find(fields, function(field) {
        return !_.isUndefined(doc.fields[field]) && !_.isNull(doc.fields[field]);
    });
    return definedField && doc.fields[definedField];
};

var getRegistrations = function(db, patientId, callback) {
    if (!patientId) {
        return callback();
    }
    utils.getRegistrations({ db: db, id: patientId }, callback);
};

var addValidationErrors = function(registrationConfig, doc, errors) {
    messages.addErrors(doc, errors);
    // join all errors into one response or respond with first error.
    if (registrationConfig.validations.join_responses) {
        var msgs = [];
        _.each(errors, function(err) {
            if (err.message) {
                msgs.push(err.message);
            } else if (err) {
                msgs.push(err);
            }
        });
        messages.addReply(doc, msgs.join('  '));
    } else {
        var err = _.first(errors);
        messages.addReply(doc, err.message || err);
    }
};

var getPatientNameField = function(params) {
    if (Array.isArray(params) && params.length && params[0]) {
        return params[0];
    }

    if (params && params.patient_name_field) {
        return params.patient_name_field;
    }

    return 'patient_name';
};

module.exports = {
    filter: function(doc) {
        var self = module.exports,
            form = utils.getForm(doc && doc.form);
        return Boolean(
            doc.type === 'data_record' &&
            self.getRegistrationConfig(self.getConfig(), doc.form) &&
            !self._hasRun(doc) &&
            (
                (doc && doc.content_type === XFORM_CONTENT_TYPE) || // xform submission
                (form && utils.getClinicPhone(doc)) || // json submission by known submitter
                (form && form.public_form) // json submission to public form
            )
        );
    },
    _hasRun: function(doc) {
        return Boolean(
            doc &&
            doc.transitions &&
            doc.transitions.registration
        );
    },
    getDOB: function(doc) {
        if (!doc || !doc.fields) {
            return '';
        }
        var today = moment(date.getDate()).startOf('day');
        var weeks = parseInt(module.exports.getWeeksSinceDOB(doc), 10);
        if (!isNaN(weeks)) {
            return today.startOf('week').subtract(weeks, 'weeks');
        }
        var days = parseInt(module.exports.getDaysSinceDOB(doc), 10);
        if (!isNaN(days)) {
            return today.subtract(days, 'days');
        }
        // no given date of birth - return today as it's the best we can do
        return today;
    },
    getWeeksSinceDOB: function(doc) {
        var fields = [ 'weeks_since_dob', 'dob', 'weeks_since_birth', 'age_in_weeks' ];
        return findFirstDefinedValue(doc, fields);
    },
    getDaysSinceDOB: function(doc) {
        var fields = [ 'days_since_dob', 'days_since_birth', 'age_in_days' ];
        return findFirstDefinedValue(doc, fields);
    },
    /*
     * Given a doc get the LMP value as a number, including 0.  Supports three
     * property names atm.
     * */
    getWeeksSinceLMP: function(doc) {
        var props = ['weeks_since_lmp', 'last_menstrual_period', 'lmp'],
            ret,
            val;
        _.each(props, function(prop) {
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
    isIdOnly: function(doc) {
        /* if true skip schedule creation */
        return Boolean(doc.getid || doc.skip_schedule_creation);
    },
    isBoolExprFalse: function(doc, expr) {
        if (typeof expr !== 'string') {
          return false;
        }
        if (expr.trim() === '') {
          return false;
        }
        try {
          //TODO eval in separate process
          var sandbox = { doc: doc };
          return !vm.runInNewContext(expr, sandbox);
        } catch(e) {
          logger.warn('Failed to eval boolean expression:');
          logger.warn(e);
          return true;
        }
    },
    setExpectedBirthDate: function(doc) {
        var lmp = Number(module.exports.getWeeksSinceLMP(doc)),
            start = moment(date.getDate()).startOf('week');
        if (lmp === 0) {
            // means baby was already born, chw just wants a registration.
            doc.lmp_date = null;
            doc.expected_date = null;
        } else {
            start.subtract(lmp, 'weeks');
            doc.lmp_date = start.toISOString();
            doc.expected_date = start.clone().add(40, 'weeks').toISOString();
        }
    },
    setBirthDate: function(doc) {
        var dob = module.exports.getDOB(doc);
        if (dob) {
            doc.birth_date = dob.toISOString();
        }
    },
    getConfig: function() {
        return _.extend({}, config.get('registrations'));
    },
    /*
     * Given a form code and config array, return config for that form.
     * */
    getRegistrationConfig: function(config, form_code) {
        return _.find(config, function(conf) {
            return utils.isFormCodeSame(form_code, conf.form);
        });
    },
    validate: function(config, doc, callback) {
        var validations = config.validations && config.validations.list;
        return validation.validate(doc, validations, callback);
    },
    onMatch: function(change, db, audit, callback) {
        var self = module.exports,
            doc = change.doc,
            registrationConfig = self.getRegistrationConfig(self.getConfig(), doc.form);

        if (!registrationConfig) {
            return callback();
        }

        self.validate(registrationConfig, doc, function(errors) {
            if (errors && errors.length > 0) {
                addValidationErrors(registrationConfig, doc, errors, callback);
                return callback(null, true);
            }

            if (doc.fields && doc.fields.patient_id) {
                // We're attaching this registration to an existing patient, let's
                // make sure it's valid
                return utils.getPatientContactUuid(db, doc.fields.patient_id, function(err, patientContactId) {
                    if (err) {
                        return callback(err);
                    }

                    if (!patientContactId) {
                        transitionUtils.addRegistrationNotFoundError(doc, registrationConfig);
                        return callback(null, true);
                    }

                    return self.fireConfiguredTriggers(db, audit, registrationConfig, doc, callback);
                });
            } else {
                return self.fireConfiguredTriggers(db, audit, registrationConfig, doc, callback);
            }
        });
    },
    fireConfiguredTriggers: function(db, audit, registrationConfig, doc, callback) {
        var self = module.exports,
            series = [];

        _.each(registrationConfig.events, function(event) {
            var trigger = self.triggers[event.trigger];
            if (!trigger) {
                return;
            }
            if (event.name === 'on_create') {
                var obj = _.defaults({}, doc, doc.fields);
                if (self.isBoolExprFalse(obj, event.bool_expr)) {
                    return;
                }
                var options = { db: db, audit: audit, doc: doc, registrationConfig: registrationConfig };


                if (!event.params) {
                    options.params = {};
                } else {
                    try {
                        options.params = JSON.parse(event.params);
                    } catch (e) {
                        options.params = event.params.split(',');
                    }
                }

                logger.debug('Parsed params for form', options.form,
                    'trigger', event.trigger,
                    ':', options.params);

                series.push(function(cb) {
                    trigger.apply(null, [ options, cb ]);
                });
            }
        });

        async.series(series, function(err, changed) {
            if (err) {
                return callback(err, changed);
            }

            // add messages is done last so data on doc can be used in
            // messages
            self.addMessages(db, registrationConfig, doc, function() {
                callback(null, true);
            });
        });
    },
    triggers: {
        add_patient: function(options, cb) {
            // if we already have a patient id then return
            if (options.doc.patient_id) {
                return cb();
            }

            async.series([
                _.partial(module.exports.setId, options),
                _.partial(module.exports.addPatient, options)
            ], cb);
        },
        add_patient_id: function(options, cb) {
            // Deprecated name for add_patient
            console.warn('Use of add_patient_id trigger. This is deprecated in favour of add_patient.');
            module.exports.triggers.add_patient(options, cb);
        },
        add_expected_date: function(options, cb) {
            module.exports.setExpectedBirthDate(options.doc);
            cb();
        },
        add_birth_date: function(options, cb) {
            module.exports.setBirthDate(options.doc);
            cb();
        },
        assign_schedule: function(options, cb) {
            if (!options.params) {
                return cb('Please specify schedule name in settings.');
            }
            module.exports.assignSchedule(options, cb);
        },
        clear_schedule: function(options, cb) {
            if (!options.params) {
                return cb('Please specify at least one schedule name in settings.');
            }
            // Registration forms that clear schedules do so fully
            // silence_type will be split again later, so join them back
            options.report = {
              silence_type: options.params.join(','),
              silence_for: null
            };
            acceptPatientReports.handleReport(options, cb);
        }
    },
    addMessages: function(db, config, doc, callback) {
        // send response if configured
        var locale = utils.getLocale(doc),
            now = moment(date.getDate()),
            extra = {next_msg: schedules.getNextTimes(doc, now)},
            patientId = doc.fields && doc.fields.patient_id;
        if (!config.messages || !config.messages.length) {
            return callback();
        }
        getRegistrations(db, patientId, function(err, registrations) {
            if (err) {
                return callback(err);
            }
            config.messages.forEach(function(msg) {
                if (!msg.event_type || msg.event_type === 'report_accepted') {
                    messages.addMessage({
                        doc: doc,
                        phone: messages.getRecipientPhone(doc, msg.recipient),
                        message: messages.getMessage(msg, locale),
                        options: extra,
                        registrations: registrations
                    });
                }
            });
            callback();
        });
    },
    assignSchedule: function(options, callback) {
        getRegistrations(
            options.db,
            options.doc.fields && options.doc.fields.patient_id,
            function(err, registrations) {
                if (err) {
                    return callback(err);
                }
                options.params.forEach(function(name) {
                    var schedule = schedules.getScheduleConfig(name);
                    var assigned = schedules.assignSchedule(options.doc, schedule, registrations);
                    if (!assigned) {
                        logger.error('Failed to add schedule please verify settings.');
                    }
                });
                callback();
            }
        );
    },
    setId: function(options, callback) {
        var doc = options.doc,
            db = db || options.db;

        var patientIdField = options.params.patient_id_field;

        if (patientIdField === 'patient_id') {
            callback(new Error('Configuration Error: patient_id_field cannot be patient_id'));
        } else if (patientIdField) {
            var providedId = doc.fields[options.params.patient_id_field];

            if (!providedId) {
                transitionUtils.addRejectionMessage(
                    doc,
                    options.registrationConfig,
                    'no_provided_patient_id');
                return callback(null, true);
            }

            transitionUtils.isIdUnique(db, providedId, function(err, isUnique) {
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
                    'provided_patient_id_not_unique');
                callback(null, true);
            });
        } else {
            transitionUtils.addUniqueId(db, doc, callback);
        }
    },
    addPatient: function(options, callback) {
        var doc = options.doc,
            db = options.db,
            audit = options.audit,
            patientShortcode = doc.patient_id,
            patientNameField = getPatientNameField(options.params);

        utils.getPatientContactUuid(db, patientShortcode, function(err, patientContactId) {
            if (err) {
                return callback(err);
            }

            if (patientContactId) {
                return callback();
            }

            db.medic.view('medic-client', 'people_by_phone', {
                key: [ doc.from ],
                include_docs: true
            }, function(err, result) {
                if (err) {
                    return callback(err);
                }
                var contact = _.result(_.first(result.rows), 'doc');
                // create a new patient with this patient_id
                var patient = {
                    name: doc.fields[patientNameField],
                    parent: contact && contact.parent,
                    reported_date: doc.reported_date,
                    type: 'person',
                    patient_id: patientShortcode
                };
                // include the DOB if it was generated on report
                if (doc.birth_date) {
                  patient.date_of_birth = doc.birth_date;
                }
                audit.saveDoc(patient, callback);
            });
        });
    }
};
