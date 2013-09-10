var _ = require('underscore'),
    utils = require('../lib/utils'),
    messages = require('../lib/messages'),
    ids = require('../lib/ids'),
    moment = require('moment'),
    config = require('../config');

module.exports = {
    filter: function(doc) {
        return Boolean(
            doc.form &&
            doc.patient_name &&
            doc.related_entities &&
            doc.related_entities.clinic &&
            doc.related_entities.clinic.contact &&
            doc.related_entities.clinic.contact.phone &&
            doc.weeks_since_lmp || doc.last_menstrual_period &&
            (!doc.patient_id || !doc.lmp_date)
        );
    },
    validateLMP: function(doc) {
        var lmp = Number(doc.weeks_since_lmp || doc.last_menstrual_period);

        return lmp >= 0 && lmp <= 40; // this will return false if NaN
    },
    validateName: function(doc, options) {
        var name = doc.patient_name || '',
            max;

        options = options || {};
        max = options.max_name_length || 100;

        return name.length > 0 && name.length <= max;
    },
    isIdOnly: function(doc) {
        return !!doc.getid;
    },
    setDate: function(doc) {
        var lmp = doc.lmp,
            start = moment().startOf('week');

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
            phone = utils.getClinicPhone(doc),
            validLMP = module.exports.validateLMP(doc),
            validName = module.exports.validateName(doc, options),
            idOnly = module.exports.isIdOnly(doc);

        if (options.form !== doc.form) {
            callback(null, false);
        } else if (idOnly) {
            // no schedule, and have valid name
            if (validName) {
                module.exports.setId({
                    db: db,
                    doc: doc
                }, function(err) {
                    callback(err, true);
                });
            // id only but invalid name
            } else {
                messages.addReply(doc, options.include_patient_name);
                callback(null, true);
            }
        } else if (validLMP && validName) {
            module.exports.setDate(doc);
            module.exports.setId({
                db: db,
                doc: doc
            }, function(err) {
                callback(err, true);
            });
        } else if (validLMP) { // validName must be false
            messages.addReply(doc, options.invalid_name);
            callback(null, true);
        } else if (validName) { // validLMP must be false
            messages.addReply(doc, options.invalid_lmp);
            callback(null, true);
        } else {
            messages.addReply(doc, options.invalid_values);
            callback(null, true);
        }
    },
    setId: function(options, callback) {
        var doc = options.doc,
            id = ids.generate(doc.serial_number);

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
