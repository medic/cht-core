var _ = require('underscore'),
    mustache = require('mustache'),
    utils = require('./utils');

function addMessage(opts) {
    var doc = opts.doc,
        details = module.exports.extractDetails(doc),
        phone = opts.phone || details[opts.phone_key] || doc[opts.phone_backup];

    _.defaults(details, opts.options || {}); // if passed, apply these

    if (phone) {
        try {
            utils.addMessage(doc, {
                phone: phone,
                message: mustache.to_html(opts.message, details)
            });
        } catch(e) {
            utils.addError(doc, {
                message: e.message + ': ' + opts.message,
                code: 'parse_error'
            });
        }
    }
}

module.exports = {
    extractDetails: function(doc) {
        return {
            clinic_name: utils.getClinicName(doc),
            contact_name: utils.getClinicContactName(doc),
            contact_phone: utils.getClinicPhone(doc),
            clinic_phone: utils.getClinicPhone(doc),
            chw_name: utils.getClinicContactName(doc),
            chw_phone: utils.getClinicPhone(doc),
            patient_id: doc.patient_id,
            patient_name: doc.patient_name,
            mother_patient_id: doc.mother_patient_id,
            grandparent_phone: utils.getGrandparentPhone(doc),
            parent_phone: utils.getParentPhone(doc),
            serial_number: doc.serial_number
        }
    },
    scheduleMessage: function(doc, msg, phone) {
        var details = module.exports.extractDetails(doc);

        try {
            utils.addScheduledMessage(doc, {
                due: msg.due,
                message: mustache.to_html(msg.message, details),
                group: msg.group,
                phone: phone,
                type: msg.type
            });
        } catch(e) {
            utils.addError(doc, {
                message: e.message + ': ' + msg.message,
                code: 'parse_error'
            });
        }
    },
    getRecipientPhone: function(doc, recipient) {
        if (!recipient) {
            return;
        }
        if (recipient === 'clinic') {
            return utils.getClinicPhone(doc);
        }
        if (recipient === 'parent') {
            return utils.getParentPhone(doc);
        }
        if (recipient === 'grandparent') {
            return utils.getGrandparentPhone(doc);
        }
    },
    addMessage: addMessage,
    notifyGrandparent: function(doc, message, options) {
        addMessage({
            doc: doc,
            message: message,
            phone_key: 'grandparent_phone',
            options: options
        });
    },
    notifyParent: function(doc, message, options) {
        addMessage({
            doc: doc,
            message: message,
            phone_key: 'parent_phone',
            options: options
        });
    },
    addReply: function(doc, message, options) {
        addMessage({
            doc: doc,
            message: message,
            phone_key: 'clinic_phone',
            phone_backup: 'from',
            options: options
        });
    },
    addErrors: function(doc, errors) {
        _.each(errors, function(error) {
            module.exports.addError(doc, error);
        });
    },
    addError: function(doc, error) {
        try {
            utils.addError(doc, {
                message: mustache.to_html(error, module.exports.extractDetails(doc))
            });
        } catch(e) {
            utils.addError(doc, {
                message: e.message + ': ' + error,
                code: 'parse_error'
            });
        }
    }
};
