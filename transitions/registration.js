var _ = require('underscore'),
    async = require('async'),
    utils = require('../lib/utils'),
    messages = require('../lib/messages'),
    validation = require('../lib/validation'),
    schedules = require('../lib/schedules'),
    ids = require('../lib/ids'),
    moment = require('moment'),
    config = require('../config'),
    date = require('../date');

module.exports = {
    filter: function(doc) {
        function hasConfig(doc) {
            var self = module.exports,
                config = self.getRegistrationConfig(self.getConfig(), doc.form);
            return Boolean(config);
        }
        return Boolean(
            doc.form &&
            utils.getClinicPhone(doc) &&
            doc.errors.length === 0 &&
            hasConfig(doc)
        );
    },
    getWeeksSinceDOB: function(doc) {
        return String(
            doc.weeks_since_dob || doc.dob || doc.weeks_since_birth || doc.age_in_weeks
        );
    },
    /*
     * Given a doc get the LMP value as a number, including 0.  Supports three
     * property names atm.
     * */
    getWeeksSinceLMP: function(doc) {
        var props = ['weeks_since_lmp', 'last_menstrual_period', 'lmp'],
            ret;
        _.each(props, function(prop) {
            if (_.isNumber(ret) && !_.isNaN(ret)) return;
            if (_.isNumber(Number(doc[prop]))) {
                ret = Number(doc[prop]);
            }
        });
        return ret;
    },
    isIdOnly: function(doc) {
        /* if true skip schedule creation */
        return Boolean(doc.getid || doc.skip_schedule_creation);
    },
    isBoolExprFalse: function(doc, expr) {
        // TODO fix bad eval
        if (expr && !eval(expr)) {
            return true;
        } else {
            return false;
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
        var ret;
        _.each(config, function(conf) {
            if (RegExp('^\W*' + form_code + '\\W*$','i').test(conf.form)) {
                ret = conf;
            }
        });
        return ret;
    },
    validate: function(config, doc) {
        var validations = config.validations && config.validations.list;
        return validation.validate(doc, validations);
    },
    onMatch: function(change, db, callback) {
        var self = module.exports,
            doc = change.doc,
            config = self.getRegistrationConfig(self.getConfig(), doc.form),
            phone = utils.getClinicPhone(doc),
            isIdOnly = self.isIdOnly(doc);

        if (!config) {
            return callback(null, false);
        }

        var errors = self.validate(config, doc);

        if (errors.length) {
            messages.addErrors(doc, errors);
            if (config.validations.join_responses) {
                var msgs = [];
                _.each(errors, function(err) {
                    if (err.message) {
                        msgs.push(err.message);
                    } else if (err) {
                        msgs.push(err);
                    };
                });
                messages.addReply(doc, msgs.join('  '));
            } else {
                messages.addReply(doc, _.first(errors).message || _.first(errors));
            }
            return callback(null, true);
        }

        var series = [];
        _.each(config.events, function(event) {
            var trigger = self.triggers[event.trigger];
            if (!trigger) return;
            if (event.name === 'on_create') {
                var args = [db, doc];
                if (event.params) {
                    // params setting get sent as array
                    args.push(event.params.split(','));
                }
                if (self.isBoolExprFalse(doc, event.bool_expr)) {
                    return;
                }
                series.push(function(callback) {
                    trigger.apply(null, args.concat(callback));
                });
            }
        });
        async.series(series, function(err, results) {
            //callback(null, true);
            if (err) {
                callback(err, false);
            } else {
                // add messages is done last so data on doc can be used in
                // messages
                self.addMessages(config, doc);
                callback(null, true);
            }
        });
    },
    triggers: {
        'add_patient_id': function(db, doc, cb) {
            var args = Array.prototype.slice.call(arguments),
                self = module.exports;
            cb = args.pop();
            if (typeof cb !== 'function') {
                return;
            }
            // if we already have a patient id then return
            if (doc.patient_id) return;
            self.setId({db: db, doc: doc}, cb);
        },
        "add_expected_date": function(db, doc, cb) {
            var args = Array.prototype.slice.call(arguments),
                self = module.exports;
            cb = args.pop();
            if (typeof cb !== 'function') {
                return;
            }
            self.setExpectedBirthDate(doc);
            cb();
        },
        "add_birth_date": function(db, doc, cb) {
            var args = Array.prototype.slice.call(arguments),
                self = module.exports;
            cb = args.pop();
            if (typeof cb !== 'function') {
                return;
            }
            self.setBirthDate(doc);
            cb();
        },
        'assign_schedule': function(db, doc, cb) {
            var self = module.exports,
                args = Array.prototype.slice.call(arguments);
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
                    console.error(
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
            _.each(config.messages, function(msg, idx) {
                // if locale is specified on doc and message then only send
                // those messages, otherwise send the message.
                if (locale && msg.locale && locale !== msg.locale) {
                    return;
                }
                messages.addMessage({
                    doc: doc,
                    phone: messages.getRecipientPhone(doc, msg.recipient),
                    message: msg.message,
                    options: extra
                });
            });
        }
    },
    setId: function(options, callback) {
        var doc = options.doc,
            id = ids.generate(doc.id),
            self = module.exports;

        utils.getRegistrations({
            db: options.db,
            id: id,
            form: doc.form
        }, function(err, registrations) {
            if (err) {
                callback(err);
            } else if (registrations.length) { // id collision, retry
                self.setId({db:db, doc:doc}, callback);
            } else {
                doc.patient_id = id;
                callback();
            }
        });
    }
};
