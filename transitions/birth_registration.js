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
            module.exports.getWeeksSinceDOB(doc) &&
            (!doc.patient_id || !doc.birth_date) &&
            doc.errors.length === 0
        );
    },
    getWeeksSinceDOB: function(doc) {
        return String(
            doc.weeks_since_dob || doc.dob || doc.weeks_since_birth
        );
    },
    setDate: function(doc) {
        var weeks_since = module.exports.getWeeksSinceDOB(doc),
            start = moment(date.getDate()).startOf('week');

        start.subtract(Number(weeks_since), 'weeks');

        doc.birth_date = start.toISOString();
    },
    getConfig: function() {
        return _.extend({}, config.get('birth_registration'));
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            config = module.exports.getConfig(),
            phone = utils.getClinicPhone(doc);

        if (!utils.isFormCodeSame(config.form, doc.form)) {
            return callback(null, false);
        }

        var errors = validation.validate(doc, config.validations);

        if (errors.length) {
            messages.addErrors(doc, errors);
            messages.addReply(doc, errors.join('  '));
            return callback(null, true);
        } else {
            module.exports.setDate(doc);
            module.exports.setId({
                db: db,
                doc: doc
            }, function(err) {
                callback(err, true);
            });
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
