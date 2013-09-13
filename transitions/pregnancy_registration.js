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
            module.exports.getWeeksSinceLMP(doc) &&
            (!doc.patient_id || !doc.lmp_date)
        );
    },
    getWeeksSinceLMP: function(doc) {
        return Number(
            doc.weeks_since_lmp || doc.last_menstrual_period || doc.lmp
        );
    },
    isIdOnly: function(doc) {
        return !!doc.getid;
    },
    setDate: function(doc) {
        var lmp = module.exports.getWeeksSinceLMP(doc),
            start = moment(date.getDate()).startOf('week');

        start.subtract(Number(lmp), 'weeks');

        doc.lmp_date = start.toISOString();
        doc.expected_date = start.clone().add(40, 'weeks').toISOString();
    },
    getConfig: function() {
        return _.extend({}, config.get('pregnancy_registration'));
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            options = module.exports.getConfig(),
            errors,
            idOnly = module.exports.isIdOnly(doc);

        if (!utils.isFormCodeSame(options.form, doc.form)) {
            callback(null, false);
        } else if (idOnly) {
            // no schedule, and have valid name
            errors = validation.validate(doc, options.validations, 'lmp');
            if (errors.length) {
                messages.addReply(doc, errors.join(', '));
                callback(null, true);
            } else {
                module.exports.setId({
                    db: db,
                    doc: doc
                }, function(err) {
                    callback(err, true);
                });
            }
        } else {
            errors = validation.validate(doc, options.validations);

            if (errors.length) {
                messages.addReply(doc, errors.join(', '));
                callback(null, true);
            } else {
                module.exports.setDate(doc);
                module.exports.setId({
                    db: db,
                    doc: doc
                }, function(err) {
                    callback(err, true);
                });
            }
        }
    },
    setId: function(options, callback) {
        var doc = options.doc,
            id = ids.generate(doc.serial_number),
            self = module.exports;

        utils.getRegistrations({
            db: options.db,
            id: id
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
