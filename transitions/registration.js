var vm = require('vm'),
    _ = require('underscore'),
    async = require('async'),
    utils = require('../lib/utils'),
    logger = require('../lib/logger'),
    messages = require('../lib/messages'),
    validation = require('../lib/validation'),
    schedules = require('../lib/schedules'),
    ids = require('../lib/ids'),
    moment = require('moment'),
    config = require('../config'),
    date = require('../date');

module.exports = {
    filter: function(doc) {
        var self = module.exports,
            form = utils.getForm(doc && doc.form);
        return Boolean(
            form &&
            self.getRegistrationConfig(self.getConfig(), doc.form) &&
            (utils.getClinicPhone(doc) || (form && form.public_form)) &&
            !self._hasRun(doc)
        );
    },
    _hasRun: function(doc) {
        return Boolean(
            doc &&
            doc.transitions &&
            doc.transitions.registration
        );
    },
    getWeeksSinceDOB: function(doc) {
        if (!doc || !doc.fields) {
            return '';
        }
        return String(
            doc.fields.weeks_since_dob ||
            doc.fields.dob ||
            doc.fields.weeks_since_birth ||
            doc.fields.age_in_weeks
        );
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
        var weeks_since = module.exports.getWeeksSinceDOB(doc),
            start = moment(date.getDate()).startOf('week');
        start.subtract(Number(weeks_since), 'weeks');
        doc.birth_date = start.toISOString();
    },
    getConfig: function() {
        return _.extend({}, config.get('registrations'));
    },
    /*
     * Given a form code and config array, return config for that form.
     * */
    getRegistrationConfig: function(config, form_code) {
        var regex = new RegExp('^\W*' + form_code + '\\W*$','i');
        return _.find(config, function(conf) {
            return regex.test(conf.form);
        });
    },
    validate: function(config, doc, callback) {
        var validations = config.validations && config.validations.list;
        return validation.validate(doc, validations, callback);
    },
    onMatch: function(change, db, audit, callback) {
        var self = module.exports,
            doc = change.doc,
            config = self.getRegistrationConfig(self.getConfig(), doc.form);

        if (!config) {
            return callback();
        }

        self.validate(config, doc, function(errors) {

            if (errors && errors.length > 0) {
                messages.addErrors(doc, errors);
                // join all errors into one response or respond with first
                // error.
                if (config.validations.join_responses) {
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
                return callback(null, true);
            }

            var series = [];
            _.each(config.events, function(event) {
                var trigger = self.triggers[event.trigger];
                if (!trigger) {
                    return;
                }
                if (event.name === 'on_create') {
                    var obj = _.defaults({}, doc, doc.fields);
                    if (self.isBoolExprFalse(obj, event.bool_expr)) {
                        return;
                    }
                    var options = { db: db, audit: audit, doc: doc };
                    if (event.params) {
                        // params setting get sent as array
                        options.params = event.params.split(',');
                    }
                    series.push(function(cb) {
                        trigger.apply(null, [ options, cb ]);
                    });
                }
            });

            async.series(series, function(err) {
                if (err) {
                    return callback(err);
                }
                // add messages is done last so data on doc can be used in
                // messages
                self.addMessages(config, doc);
                callback(null, true);
            });
        });
    },
    triggers: {
        add_patient_id: function(options, cb) {
            // if we already have a patient id then return
            if (options.doc.patient_id) {
                return;
            }
            module.exports.setId(options, cb);
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
            _.each(options.params, function(name) {
                var bool = schedules.assignSchedule(options.doc, schedules.getScheduleConfig(name));
                if (!bool) {
                    logger.error('Failed to add schedule please verify settings.');
                }
            });
            cb();
        },
        add_patient: function(options, cb) {
            if (!options.doc.patient_id) {
                // must have a patient id so we can find them later
                return cb();
            }
            module.exports.addPatient(options, cb);
        }
    },
    addMessages: function(config, doc) {
        // send response if configured
        var locale = utils.getLocale(doc),
            now = moment(date.getDate()),
            extra = {next_msg: schedules.getNextTimes(doc, now)};
        if (config.messages) {
            _.each(config.messages, function(msg) {
                messages.addMessage({
                    doc: doc,
                    phone: messages.getRecipientPhone(doc, msg.recipient),
                    message: messages.getMessage(msg.message, locale),
                    options: extra
                });
            });
        }
    },
    setId: function(options, callback) {
        var doc = options.doc,
            db = db || options.db,
            id = ids.generate(doc.id),
            self = module.exports;

        utils.getRegistrations({
            db: db,
            id: id
        }, function(err, registrations) {
            if (err) {
                callback(err);
            } else if (registrations.length) { // id collision, retry
                logger.warn('Registration ID ' + id + ' is not unique, retrying...');
                self.setId({db:db, doc:doc}, callback);
            } else {
                doc.patient_id = id;
                callback();
            }
        });
    },
    addPatient: function(options, callback) {
        var doc = options.doc,
            db = options.db,
            audit = options.audit,
            id = doc.patient_id,
            patientNameField = (options.params && options.params.length && options.params[0]) || 'patient_name';

        utils.getRegistrations({
            db: db,
            id: id
        }, function(err, registrations) {
            if (err) {
                return callback(err);
            }
            if (registrations.length) {
                // patient already registered, no action required
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
                    patient_id: id
                };
                audit.saveDoc(patient, callback);
            });
        });
    }
};
