var _ = require('underscore'),
    utils = require('../lib/utils'),
    ids = require('../lib/ids'),
    moment = require('moment'),
    config = require('../config');

module.exports = {
    filter: function(doc) {
        var valid = doc.form && (!doc.patient_id || !doc.lmp_date);

        return !!valid;
    },
    validateLMP: function(doc) {
        var lmp = Number(doc.lmp);

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
            validName = module.exports.validateName(doc),
            idOnly = module.exports.isIdOnly(doc);

        if (idOnly) {
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
                utils.addMessage(doc, {
                    message: options.include_patient_name,
                    phone: phone
                });
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
        } else if (validLMP) {
        } else if (validName) {
        } else {
            callback(null, false);
        }
    },
    setId: function(options, callback) {
        var doc = options.doc,
            id = ids.generate(doc.serial_number);

        utils.getRegistration({
            db: options.db,
            id: id
        }, function(err, found) {
            if (err) {
                callback(err);
            } else if (found) { // id collision, retry
                self.setId(doc, callback);
            } else {
                doc.patient_id = id;
                callback();
            }
        });
    },
    repeatable: true
};
