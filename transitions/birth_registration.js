var _ = require('underscore'),
    utils = require('../lib/utils'),
    messages = require('../lib/messages'),
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
            (!doc.patient_id || !doc.birth_date)
        );
    },
    getWeeksSinceDOB: function(doc) {
        return Number(
            doc.weeks_since_dob || doc.dob
        );
    },
    validateDOB: function(doc) {
        var dob = module.exports.getWeeksSinceDOB(doc);

        return dob >= 0 && dob <= 52; // this will return false if NaN
    },
    validateName: function(doc, options) {
        var name = doc.patient_name || '',
            max;

        options = options || {};
        max = options.max_name_length || 100;

        return name.length > 0 && name.length <= max;
    },
    setDate: function(doc) {
        var dob = module.exports.getWeeksSinceDOB(doc),
            start = moment(date.getDate()).startOf('week');

        start.subtract(Number(dob), 'weeks');

        doc.birth_date = start.toISOString();
    },
    getConfig: function() {
        return _.extend({}, config.get('birth_registration'));
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            options = module.exports.getConfig(),
            phone = utils.getClinicPhone(doc),
            validDOB  = module.exports.validateDOB(doc),
            validName = module.exports.validateName(doc, options);

        if (options.form !== doc.form) {
            callback(null, false);
        } else if (validDOB && validName) {
            module.exports.setDate(doc);
            module.exports.setId({
                db: db,
                doc: doc
            }, function(err) {
                callback(err, true);
            });
        } else if (validDOB) { // validName must be false
            messages.addReply(doc, options.invalid_name);
            callback(null, true);
        } else if (validName) { // validLMP must be false
            messages.addReply(doc, options.invalid_dob);
            callback(null, true);
        } else {
            messages.addReply(doc, options.invalid_values);
            callback(null, true);
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
