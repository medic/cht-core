var _ = require('underscore'),
    mustache = require('mustache'),
    utils = require('./utils');

module.exports = {
    extractDetails: function(doc) {
        return {
            clinic_name: utils.getClinicName(doc),
            contact_name: utils.getClinicContactName(doc),
            chw_name: utils.getClinicContactName(doc),
            clinic_phone: utils.getClinicPhone(doc),
            patient_id: doc.patient_id,
            patient_name: doc.patient_name,
            serial_number: doc.serial_number
        }
    },
    scheduleMessage: function(doc, msg) {
        var details = module.exports.extractDetails(doc);

        utils.addScheduledMessage(doc, {
            due: msg.due,
            message: mustache.to_html(msg.message, details),
            group: msg.group,
            phone: details.clinic_phone || doc.from,
            type: msg.type
        });
    },
    addReply: function(doc, message, options) {
        var details = module.exports.extractDetails(doc);

        _.defaults(details, options || {}); // if passed, apply these

        utils.addMessage(doc, {
            phone: details.clinic_phone || doc.from,
            message: mustache.to_html(message, details)
        });
    },
    addError: function(doc, error) {
        utils.addError(doc, {
            message: mustache.to_html(error, module.exports.extractDetails(doc))
        });
    }
};
