exports.sms_message_values = {
    map: function (doc) {
        var smsparser = require('views/lib/smsparser'),
            smsforms = require('views/lib/smsforms');

        if (doc.type === 'sms_message' && doc.form) {
            var def = smsforms[doc.form];
            if (def) {
                emit(
                    [doc.form, doc.sent_timestamp],
                    smsparser.parseArray(def, doc));
            }
        }
    }
};

exports.sms_messages = {
    map: function (doc) {
        if (doc.type === 'sms_message') {
            emit(doc._id);
        }
    }
};

/*
 * Get clinic based on phone number
 */
exports.clinic_by_phone = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            emit([doc.contact.phone], doc);
        }
    }
};

/*
 * Get clinic based on health center phone number
 */
exports.clinic_by_parent_phone = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            emit([doc.parent.contact.phone], doc);
        }
    }
};

/*
 * Get clinic based on referral id in a tasks_referral doc.
 */
exports.clinic_by_refid = {
    map: function (doc) {
        if (doc.type === 'tasks_referral' && doc.refid) {
            // need String because rewriter wraps everything in quotes
            emit([String(doc.refid), doc.created], doc.clinic);
        }
    }
};

exports.tasks_pending = {
    map: function (doc) {
        if (doc.type.substr(0,6) === 'tasks_' && doc.state === 'pending') {
            emit([doc.created, doc.refid]);
        }
    }
};
