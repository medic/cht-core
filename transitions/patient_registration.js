var _ = require('underscore'),
    utils = require('../lib/utils'),
    messages = require('../lib/messages'),
    validation = require('../lib/validation'),
    ids = require('../lib/ids'),
    moment = require('moment'),
    config = require('../config'),
    date = require('../date');

module.exports = {
    filter: function(doc) {
        return Boolean(
            doc.form &&
            utils.getClinicPhone(doc) &&
            !doc.patient_id &&
            doc.errors.length === 0
        );
    },
    getWeeksSinceDOB: function(doc) {
        return String(
            doc.weeks_since_dob || doc.dob || doc.weeks_since_birth
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
        return _.extend({}, config.get('patient_registrations'));
    },
    /* given a form code and config array, return config for that form. */
    getRegistrationConfig: function(config, form_code) {
        var ret;
        _.each(config, function(conf) {
            if (RegExp('^\W*' + form_code + '\\W*$','i').test(conf.form)) {
                ret = conf;
            }
        });
        return ret;
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

        var errors = validation.validate(doc, config.validations);

        if (errors.length) {
            messages.addErrors(doc, errors);
            messages.addReply(doc, errors.join('  '));
            return callback(null, true);
        }

        self.setId({
            db: db,
            doc: doc
        }, function(err) {
            if (err) {
                return callback(err, true);
            }
            if (config.type === 'birth' && !isIdOnly) {
                self.setBirthDate(doc);
            } else if (config.type === 'pregnancy' && !isIdOnly) {
                self.setExpectedBirthDate(doc);
            }
            self.addMessages(config, doc);
            callback(null, true);
        });
    },
    addMessages: function(config, doc) {
        // send response if configured
        var locale = utils.getLocale(doc);
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
                    message: msg.message
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
                self.setId(doc, callback);
            } else {
                doc.patient_id = id;
                callback();
            }
        });
    },
    repeatable: true
};
