
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

exports.data_records_valid_by_district_form_and_reported_date = {
    map: function(doc) {
        if(doc.type === 'data_record') {
            var jsonforms = require('views/lib/jsonforms'),
                def = jsonforms[doc.form];

            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent
                    && (!doc.errors || doc.errors.length === 0)) {
                var dh = doc.related_entities.clinic.parent.parent;
                emit([dh._id, doc.form, dh.name, doc.reported_date], 1);
            } else if (doc.related_entities.health_center
                    && doc.related_entities.health_center.parent
                    && (!doc.errors || doc.errors.length === 0)) {
                var dh = doc.related_entities.health_center.parent;
                emit([dh._id, doc.form, dh.name, doc.reported_date], 1);
            } else if (!doc.errors || doc.errors.length === 0) {
                emit([null, doc.form, null, doc.reported_date], 1);
            }
        }
    }
};

// only emit valid records
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
            } else if (doc.related_entities.health_center
                    && doc.related_entities.health_center.parent
                    && (!doc.errors || doc.errors.length === 0)) {
                var dh = doc.related_entities.health_center.parent;
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
                if (dh.type !== 'district_hospital')
                    return;
                emit([dh._id, dh.name], null);
            }
        }
    },

    reduce: function(key, doc) {
        return true;
    }
};

exports.data_records_by_district_and_clinic = {
    map: function(doc) {
        var dh = {_id: null},
            cl = {_id: null};
        if(doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
                cl = doc.related_entities.clinic;
                cl.contact = doc.related_entities.clinic.contact || {};
                if (dh.type !== 'district_hospital') return;
                emit([dh._id, cl._id, cl.name, cl.contact.name], null);
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

// by district
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

exports.data_records_by_valid_and_reported_date = {
    map: function(doc) {
        if (doc.type === 'data_record') {
            var valid = (!doc.errors || doc.errors.length === 0);
            emit([valid, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_district_valid_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
            }
            var valid = (!doc.errors || doc.errors.length === 0);
            emit([dh._id, valid, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_form_valid_and_reported_date = {
    map: function(doc) {
        if (doc.type === 'data_record') {
            var valid = (!doc.errors || doc.errors.length === 0);
            emit([doc.form, valid, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_district_form_valid_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
            }
            var valid = (!doc.errors || doc.errors.length === 0);
            emit([dh._id, doc.form, valid, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_patient_id_and_reported_date = {
    map: function(doc) {
        if (doc.type === 'data_record') {
            if (doc.patient_id)
                emit([doc.patient_id, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_district_patient_id_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
            }
            if (doc.patient_id)
                emit([dh._id, doc.patient_id, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_district_clinic_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null},
            cl = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
                cl = doc.related_entities.clinic;
            }
            emit([dh._id, cl._id, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_clinic_and_reported_date = {
    map: function(doc) {
        var cl = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                cl = doc.related_entities.clinic;
            }
            emit([cl._id, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_district_clinic_form_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null},
            cl = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
                cl = doc.related_entities.clinic;
            }
            emit([dh._id, cl._id, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_clinic_form_and_reported_date = {
    map: function(doc) {
        var cl = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                cl = doc.related_entities.clinic;
            }
            emit([cl._id, doc.form, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_district_clinic_valid_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null},
            cl = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
                cl = doc.related_entities.clinic;
            }
            var valid = (!doc.errors || doc.errors.length === 0);
            emit([dh._id, cl._id, valid, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_clinic_valid_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null},
            cl = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
                cl = doc.related_entities.clinic;
            }
            var valid = (!doc.errors || doc.errors.length === 0);
            emit([cl._id, valid, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_district_clinic_form_valid_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null},
            cl = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
                cl = doc.related_entities.clinic;
            }
            var valid = (!doc.errors || doc.errors.length === 0);
            emit([dh._id, cl._id, doc.form, valid, doc.reported_date, doc._id], doc);
        }
    }
};

exports.data_records_by_clinic_form_valid_and_reported_date = {
    map: function(doc) {
        var dh = {_id: null},
            cl = {_id: null};
        if (doc.type === 'data_record') {
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent) {
                dh = doc.related_entities.clinic.parent.parent;
                cl = doc.related_entities.clinic;
            }
            var valid = (!doc.errors || doc.errors.length === 0);
            emit([cl._id, doc.form, valid, doc.reported_date, doc._id], doc);
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

exports.facility_by_parent = {
    map: function (doc) {
        if (doc.type === 'clinic'
            || doc.type === 'health_center'
            || doc.type === 'district_hospital') {
            emit([doc.parent._id, doc.name, doc.type], true);
        }
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
        if (doc.type === 'clinic' && doc.contact && doc.contact.rc_code) {
            // need String because rewriter wraps everything in quotes
            emit([String(doc.contact.rc_code)], doc);
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
