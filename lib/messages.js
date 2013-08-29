var mustache = require('mustache'),
    utils = require('./utils');

module.exports = {
    extractDetails: function(doc) {
        return {
            clinic_name: utils.getClinicName(doc),
            clinic_phone: utils.getClinicPhone(doc),
            patient_id: doc.patient_id,
            serial_number: doc.serial_number
        }
    },
    addReply: function(doc, message) {
        utils.addMessage(doc, {
            phone: clinic_phone,
            message: mustache.to_html(message, module.exports.extractDetails(doc))
        });
    },
    addError: function(doc, error) {
        utils.addError(doc, {
            message: mustache.to_html(error, module.exports.extractDetails(doc))
        });
    }
};
