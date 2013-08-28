var utils = require('../lib/utils'),
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

        return name.length <= max;
    },
    isScheduleOnly: function(doc) {
        return !!doc.getid;
    },
    setDate: function(doc) {
        var lmp = doc.lmp,
            start = moment().startOf('week');

        start.subtract(Number(lmp), 'weeks');

        doc.lmp_date = start.toISOString();
        doc.expected_date = start.clone().add(40, 'weeks').toISOString();
    },
    onMatch: function(change, db, callback) {
        var doc = change.doc,
            validLMP = module.exports.validateLMP(doc),
            validName = module.exports.validateName(doc),
            scheduleOnly = module.exports.isScheduleOnly(doc);

        callback(null, true);
    },
    repeatable: true
};
