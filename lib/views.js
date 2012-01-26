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

exports.facilities_by_phone = {
    map: function (doc) {
        if (doc.type === 'clinic' ||
            doc.type === 'health_center' ||
            doc.type === 'district_hospital' ||
            doc.type === 'national_office') {
            emit([doc.contact.phone, doc.type, doc.contact.name]);
        }
    }
};

/*
 * Get facilities based on referral id in a task_referral doc.
 * HACK only compatible with MSBR/MSBC form (uses ref_rc)
 */
exports.facilities_by_refid = {
    map: function (doc) {
        if (doc.type === 'tasks_referral') {
            var phone = doc.facility.contact.phone,
                ref_rc = doc.form.ref_rc;
            emit([ref_rc, doc.created, phone], doc.facility);
        }
    }
};

exports.tasks_referral_pending = {
    map: function (doc) {
        var smsparser = require('views/lib/smsparser'),
            smsforms = require('views/lib/smsforms');

        if (doc.type === 'tasks_referral' && doc.state === 'pending') {
            var def = smsforms[doc.sms_message.form],
                phone = doc.facility.contact.phone;
            if (def) {
                emit([doc.created, phone, doc.facility.type, doc._id],{
                    to: phone,
                    data: smsparser.parse(def, doc.sms_message, 1)
                });
            } else {
                if (log) {
                    log('No form defintion found for doc.');
                    log('_id: ' + doc._id + ' _rev: ' + doc._rev);
                }
            }
        }
    }
};
