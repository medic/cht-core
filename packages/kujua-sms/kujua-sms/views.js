exports.data_records_by_district_and_form = {
    map: function(doc) {
        if(doc.type === 'data_record') {
            var jsonforms = require('views/lib/jsonforms'),
                def = jsonforms[doc.form];

            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                var dh = doc.related_entities.clinic.parent.parent;
                emit([dh._id, doc.form, dh.name], 1);
            } else {
                emit([null, doc.form, null], 1);
            }
        }
    },

    reduce: function(key, counts) {
        return sum(counts);
    }
};

exports.data_records_valid_by_district_and_form = {
    map: function(doc) {
        if(doc.type === 'data_record') {
            var jsonforms = require('views/lib/jsonforms'),
                def = jsonforms[doc.form];

            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent
                    && (!doc.errors || doc.errors.length === 0)) {
                var dh = doc.related_entities.clinic.parent.parent;
                emit([dh._id, doc.form, dh.name], 1);
            } else if (!doc.errors || doc.errors.length === 0) {
                emit([null, doc.form, null], 1);
            }
        }
    },

    reduce: function(key, counts) {
        return sum(counts);
    }
};

exports.data_records_by_district = {
    map: function(doc) {
        if(doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                var dh = doc.related_entities.clinic.parent.parent;
                emit([dh._id, dh.name], null);
            }
        }
    },

    reduce: function(key, doc) {
        return true;
    }
};



/*
 * Views needed to filter data records on
 * data records page.
 */

exports.data_records_by_district_and_reported_date = {
    map: function(doc) {
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                var dh = doc.related_entities.clinic.parent.parent;
                emit([dh._id, doc.reported_date, doc._id], doc);
            } else {
                emit([null, doc.reported_date, doc._id], doc);
            }
        }
    }
};

exports.data_records_by_reported_date = {
    map: function(doc) {
        if (doc.type === 'data_record') {
            emit([doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_form_and_reported_date = {
    map: function(doc) {
        if (doc.type === 'data_record') {
            emit([doc.form, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_district_form_and_reported_date = {
    map: function(doc) {
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                var dh = doc.related_entities.clinic.parent.parent;
                emit([dh._id, doc.form, doc.reported_date, doc._id], doc);
            } else {
                emit([null, doc.form, doc.reported_date, doc._id], doc);
            }
        }
    }
};

exports.data_record_by_phone_and_week = {
    map: function(doc) {
        if (doc.type === 'data_record') {
            emit([doc.from, doc.week, doc._id], doc);
        }
    }
};

/*
 * Get facility based on phone number
 */

exports.facility_by_phone = {
    map: function (doc) {
        if (doc.contact && doc.type) {
            if (doc.type === 'clinic') {
                emit([doc.contact.phone, 'clinic'], doc);
            } else if (doc.type === 'health_center') {
                emit([doc.contact.phone, 'health_center'], doc);
            } else if (doc.type === 'district_hospital') {
                emit([doc.contact.phone, 'district_hospital'], doc);
            }
        }
    }
};

/*
 * Get phone numbers for health centers based on clinic docs
 */
exports.phones_by_district_and_health_center = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            if(doc.parent
                    && doc.parent.parent
                    && doc.parent.contact
                    && doc.parent.contact.phone) {
                emit([
                    doc.parent.parent._id,
                    doc.parent._id,
                    doc.parent.name,
                    doc.parent.contact.name,
                    doc.parent.contact.phone], null);
            }
        }
    },
    reduce: function(key, doc) {
        return true;
    }
};

/*
 * Get phone numbers for clinics
 */
exports.phones_by_district_and_clinic = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            if( doc.parent
                    && doc.parent.parent
                    && doc.contact
                    && doc.contact.phone) {
                emit([
                    doc.parent.parent._id,
                    doc._id,
                    doc.name,
                    doc.contact.name,
                    doc.contact.phone], null);
            }
        }
    },
    reduce: function(key, doc) {
        return true;
    }
};

/*
 * Get phone numbers for district hospitals
 */
exports.phones_by_district = {
    map: function (doc) {
        if (doc.type === 'clinic') {
            if( doc.parent
                    && doc.parent.parent
                    && doc.parent.parent.contact
                    && doc.parent.parent.contact.phone) {
                emit([
                    doc.parent.parent._id,
                    doc.parent.parent.name,
                    doc.parent.parent.contact.name,
                    doc.parent.parent.contact.phone], null);
            }
        }
    },
    reduce: function(key, doc) {
        return true;
    }
};

/*
 * Get clinic based on phone number
 */
exports.clinic_by_phone = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.contact) {
            emit([doc.contact.phone], doc);
        }
    }
};

/*
 * Get clinic based on health center phone number
 */
exports.clinic_by_parent_phone = {
    map: function (doc) {
        if (doc.type === 'clinic'
                && doc.parent
                && doc.parent.contact
                && doc.parent.contact.phone) {
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
            emit([String(doc.refid), doc.reported_date], doc.clinic);
        }
    }
};

exports.tasks_pending = {
    map: function (doc) {
        var has_pending,
            tasks = doc.tasks || [];

        has_pending = tasks.some(function(task) {
            return task.state === 'pending';
        });
        if (has_pending) {
            emit([doc.reported_date, doc.refid]);
        }
    }
};

exports.data_record_by_year_month_and_clinic_id = {
    map: function (doc) {
        if (doc.type === 'data_record'
                && doc.related_entities
                && doc.related_entities.clinic) {
            emit([doc.year, doc.month, doc.related_entities.clinic._id], doc);
        }
    }
};

/*
 * Emit the sms_message.sent_timestamp string as created by gateway.
 */
exports.sms_message_by_sent_timestamp = {
    map: function (doc) {
        if (doc.type === 'data_record') {
            var sms = doc.sms_message;
            if(sms) {
                emit([sms.sent_timestamp, sms.form, sms.from], null);
            }
        }
    }
}
