/**
 * Views to be exported from the design doc.
 */

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

exports.clinic_by_phone = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            emit([doc.contact.phone], doc);
        }
    }
};

/*
 * Get clinic based on referral id in a tasks_referral doc.
 */
exports.clinic_by_refid = {
    map: function (doc) {
        var form_data = doc.form_data;
        if (doc.type === 'tasks_referral' && form_data && form_data.ref_rc) {
            var ref_rc = form_data.ref_rc,
                ref_rc = ref_rc.length ? ref_rc[0] : ref_rc;
            // HACK, can't get the rewriter to use numbers in query params
            emit([''+ref_rc, doc.created], doc.clinic);
        }
    }
};

exports.tasks_referral_pending = {
    map: function (doc) {
        if (doc.type === 'tasks_referral' && doc.state === 'pending') {
            emit([doc.created, doc.refid]);
        }
    }
};
