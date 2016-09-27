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

var findFirstDefinedValue = function(doc, fields) {
    var definedField = _.find(fields, function(field) {
        return !_.isUndefined(doc.fields[field]) && !_.isNull(doc.fields[field]);
    });
    return definedField && doc.fields[definedField];
};

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
    getDOB: function(doc) {
        if (!doc || !doc.fields) {
            return '';
        }
        var today = moment(date.getDate()).startOf('day');
        var weeks = parseInt(module.exports.getWeeksSinceDOB(doc), 10);
        if (!_.isNaN(weeks)) {
            return today.startOf('week').subtract(weeks, 'weeks');
        }
        var days = parseInt(module.exports.getDaysSinceDOB(doc), 10);
        if (!_.isNaN(days)) {
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
                    var args = [db, doc];
                    if (event.params) {
                        // params setting get sent as array
                        args.push(event.params.split(','));
                    }
                    var obj = _.defaults({}, doc, doc.fields);
                    if (self.isBoolExprFalse(obj, event.bool_expr)) {
                        return;
                    }
                    series.push(function(cb) {
                        trigger.apply(null, args.concat(cb));
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
        add_patient_id: function(db, doc, cb) {
            var args = Array.prototype.slice.call(arguments),
                self = module.exports;
            cb = args.pop();
            if (typeof cb !== 'function') {
                return;
            }
            // if we already have a patient id then return
            if (doc.patient_id) {
                return;
            }
            self.setId({db: db, doc: doc}, cb);
        },
        add_expected_date: function(db, doc, cb) {
            var args = Array.prototype.slice.call(arguments),
                self = module.exports;
            cb = args.pop();
            if (typeof cb !== 'function') {
                return;
            }
            self.setExpectedBirthDate(doc);
            cb();
        },
        add_birth_date: function(db, doc, cb) {
            var args = Array.prototype.slice.call(arguments),
                self = module.exports;
            cb = args.pop();
            if (typeof cb !== 'function') {
                return;
            }
            self.setBirthDate(doc);
            cb();
        },
        assign_schedule: function(db, doc, cb) {
            var args = Array.prototype.slice.call(arguments);
            if (args.length < 4) {
                cb('Please specify schedule name in settings.');
            }
            cb = args.pop();
            if (typeof cb !== 'function') {
                return;
            }
            _.each(args.pop(), function(name) {
                var bool = schedules.assignSchedule(
                    doc, schedules.getScheduleConfig(name)
                );
                if (!bool) {
                    logger.error(
                        'Failed to add schedule please verify settings.'
                    );
                }
            });
            cb();
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
    }
};
