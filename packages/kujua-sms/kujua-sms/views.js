exports.sms_message_values = {
    map: function (doc) {
        var smsparser = require('views/lib/smsparser'),
            smsforms = require('views/lib/smsforms');

        if (doc.type === 'sms_message' && doc.form) {
            var def = smsforms[doc.form];
            if (def) {
                emit(
                    [doc.form, doc.sent_timestamp],
                    smsparser.parseArray(doc.form, def, doc));
            }
        }
    }
};

exports.sms_messages = {
    map: function (doc) {
        if (doc.type === 'sms_message') {
            emit(doc._id, doc);
        }
    }
};

/*
 * Get facility based on phone number
 */
exports.facility_by_phone = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            emit([doc.contact.phone, 'clinic'], doc);
        } else if (doc.type === 'health_center') {
            emit([doc.contact.phone, 'health_center'], doc);
        } else if (doc.type === 'district_hospital') {
            emit([doc.contact.phone, 'district_hospital'], doc);
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
 * Get clinic based on referral id (refid) in a tasks_referral doc.
 */
exports.clinic_by_refid = {
    map: function (doc) {
        if (doc.type === 'data_record' && doc.refid) {
            // need String because rewriter wraps everything in quotes
            emit([String(doc.refid), doc.created], doc.clinic);
        }
    }
};

exports.tasks_pending = {
    map: function (doc) {
        if (doc.tasks && doc.tasks.length) {
            for (var i in docs.tasks) {
                if (doc.tasks[i].state === 'pending') {
                    emit([doc.created, doc.refid]);
                }
            }
        }
    }
};

exports.data_record_by_year_month_and_clinic_id = {
    map: function (doc) {
        if (doc.type === 'data_record') {
            emit([doc.year, doc.month, doc.related_entities.clinic._id], doc);
        }
    }
};
