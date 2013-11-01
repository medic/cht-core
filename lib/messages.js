var _ = require('underscore'),
    mustache = require('mustache'),
    utils = require('./utils');

function addMessage(opts) {
    var self = module.exports,
        doc = opts.doc,
        details = module.exports.extractDetails(doc),
        phone = opts.phone || self.getRecipientPhone(doc, 'clinic');

    _.defaults(details, opts.options || {}); // override with options also

    if (phone) {
        try {
            utils.addMessage(doc, {
                phone: String(phone),
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
    /*
     * Provide some extra template context, internal fields always override
     * doc/form fields.
     */
    extractDetails: function(doc) {
        var clinic = utils.getClinic(doc);
        var internal = {
            contact: clinic && clinic.contact,
            clinic: clinic,
            parent: utils.getHealthCenter(doc),
            health_center: utils.getHealthCenter(doc),
            grandparent: utils.getDistrict(doc),
            district: utils.getDistrict(doc)
        };
        return _.defaults(internal, doc);
    },
    scheduleMessage: function(doc, msg, phone) {
        var details = module.exports.extractDetails(doc),
            phone = phone ? String(phone) : phone;

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
    /* try to match a recipient return undefined otherwise */
    getRecipientPhone: function(doc, recipient) {
        if (!doc) {
            return;
        }
        if (!recipient) {
            return doc.from;
        }
        recipient = recipient.trim();
        var ret;
        if (recipient === 'clinic' || recipient === 'reporting_unit') {
            ret = utils.getClinicPhone(doc);
        } else if (recipient === 'parent') {
            ret = utils.getParentPhone(doc);
        } else if (recipient === 'grandparent') {
            ret = utils.getGrandparentPhone(doc);
        }

        if (!ret && doc[recipient]) {
            // try to resolve a specified property/field name
            ret = doc[recipient];
        } else if (!ret) {
            return doc.from;
        }
        return ret;
    },
    addMessage: addMessage,
    notifyGrandparent: function(doc, message, options) {
        var self = module.exports;
        addMessage({
            doc: doc,
            message: message,
            phone: self.getRecipientPhone(doc, 'grandparent_phone'),
            options: options
        });
    },
    notifyParent: function(doc, message, options) {
        var self = module.exports;
        addMessage({
            doc: doc,
            message: message,
            phone: self.getRecipientPhone(doc, 'parent_phone'),
            options: options
        });
    },
    addReply: function(doc, message, options) {
        var self = module.exports;
        addMessage({
            doc: doc,
            message: message,
            phone: self.getRecipientPhone(doc, 'clinic'),
            options: options
        });
    },
    addErrors: function(doc, errors) {
        var self = module.exports;
        _.each(errors, function(error) {
            self.addError(doc, error);
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
