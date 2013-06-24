exports.contacts_by_id = {
    map: function(doc) {
        var district,
            facility;

        if (~['district_hospital', 'health_center', 'clinic'].indexOf(doc.type)) {
            emit([null, doc._id], null);
        }

        if (doc.type === 'district_hospital') {
            emit([doc._id, doc._id], null);
        } else if (doc.type === 'health_center') {
            district = doc.parent;

            if (district) {
                emit([district._id, doc._id], null);
            }
        } else if (doc.type === 'clinic') {
            facility = doc.parent;
            if (facility) {
                emit([facility._id, doc._id], null);

                district = facility.parent;
                if (district) {
                    emit([district._id, doc._id], null);
                }
            }
        }
    }
};

exports.contacts = {
    map: function(doc) {
        var district,
            facility,
            contact = doc.contact,
            name = doc.name,
            contactName = contact && contact.name,
            code = contact && contact.rc_code,
            phone = contact && contact.phone,
            result;

        function emitWords(district) {
            if (name) {
                name = name.replace(/[^\w\d+\s]/g, '');
                name.trim().split(/\s+/).forEach(function(token) {
                    emit([district, token], doc._id);
                });
            }
            if (contactName) {
                contactName = contactName.replace(/[^\w\d+\s]/g, '');
                contactName.trim().split(/\s+/).forEach(function(token) {
                    emit([district, token], doc._id);
                });
            }
            if (phone) {
                emit([district, phone], doc._id);
            }
            if (code) {
                emit([district, code], doc._id);
            }
        }

        if (~['district_hospital', 'health_center', 'clinic'].indexOf(doc.type)) {
            emitWords(null);
        }

        if (doc.type === 'district_hospital') {
            emitWords(doc._id);
        } else if (doc.type === 'health_center') {
            district = doc.parent;

            if (district) {
                emitWords(district._id);
            }
        } else if (doc.type === 'clinic') {
            facility = doc.parent;
            if (facility) {
                emitWords(facility._id);

                district = facility.parent;
                if (district) {
                    emitWords(district._id);
                }
            }
        }
    }
};

exports.data_records_by_district_and_form = {
    map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            dh;

        if(doc.type === 'data_record') {
            dh = objectpath.get(doc, 'doc.related_entities.clinic.parent.parent');

            if (dh) {
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

exports.data_records = {
    map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            clinicId,
            centerId,
            districtId,
            form = doc.form,
            valid;

        if (doc.type === 'data_record') {
            clinicId = objectpath.get(doc, 'related_entities.clinic._id');
            centerId = objectpath.get(doc, 'related_entities.clinic.parent._id');
            districtId = objectpath.get(doc, 'related_entities.clinic.parent.parent._id');
            valid = !doc.errors || doc.errors.length === 0;

            emit([doc.reported_date], 1);
            emit([valid, doc.reported_date], 1);

            if (form) {
                emit([form, doc.reported_date], 1);
                emit([valid, form, doc.reported_date], 1);

                emit(['*', doc.reported_date], 1);
                emit([valid, '*', doc.reported_date], 1);
            } else {
                emit(['null_form', doc.reported_date], 1);
                emit([valid, 'null_form', doc.reported_date], 1);
            }

            if (clinicId) {
                emit([clinicId, doc.reported_date], 1);
                emit([valid, clinicId, doc.reported_date], 1);

                if (form) {
                    emit([clinicId, form, doc.reported_date], 1);
                    emit([valid, clinicId, form, doc.reported_date], 1);

                    emit([clinicId, '*', doc.reported_date], 1);
                    emit([valid, clinicId, '*', doc.reported_date], 1);
                } else {
                    emit([clinicId, 'null_form', doc.reported_date], 1);
                    emit([valid, clinicId, 'null_form', doc.reported_date], 1);
                }
            }
            if (centerId) {
                emit([centerId, doc.reported_date], 1);
                emit([valid, centerId, doc.reported_date], 1);

                if (form) {
                    emit([centerId, form, doc.reported_date], 1);
                    emit([valid, centerId, form, doc.reported_date], 1);

                    emit([centerId, '*', doc.reported_date], 1);
                    emit([valid, centerId, '*', doc.reported_date], 1);
                } else {
                    emit([centerId, 'null_form', doc.reported_date], 1);
                    emit([valid, centerId, 'null_form', doc.reported_date], 1);
                }
            }
            if (districtId) {
                emit([districtId, doc.reported_date], 1);
                emit([valid, districtId, doc.reported_date], 1);

                if (form) {
                    emit([districtId, form, doc.reported_date], 1);
                    emit([valid, districtId, form, doc.reported_date], 1);

                    emit([districtId, '*', doc.reported_date], 1);
                    emit([valid, districtId, '*', doc.reported_date], 1);
                } else {
                    emit([districtId, 'null_form', doc.reported_date], 1);
                    emit([valid, districtId, 'null_form', doc.reported_date], 1);
                }
            }
            if (clinicId && districtId) {
                emit([districtId, clinicId, doc.reported_date], 1);
                emit([valid, districtId, clinicId, doc.reported_date], 1);

                if (form) {
                    emit([districtId, clinicId, form, doc.reported_date], 1);
                    emit([valid, districtId, clinicId, form, doc.reported_date], 1);

                    emit([districtId, clinicId, '*', doc.reported_date], 1);
                    emit([valid, districtId, clinicId, '*', doc.reported_date], 1);
                } else {
                    emit([districtId, clinicId, 'null_form', doc.reported_date], 1);
                    emit([valid, districtId, clinicId, 'null_form', doc.reported_date], 1);
                }
            }
            if (centerId && districtId) {
                emit([districtId, centerId, doc.reported_date], 1);
                emit([valid, districtId, centerId, doc.reported_date], 1);

                if (form) {
                    emit([districtId, centerId, form, doc.reported_date], 1);
                    emit([valid, districtId, centerId, form, doc.reported_date], 1);

                    emit([districtId, centerId, '*', doc.reported_date], 1);
                    emit([valid, districtId, centerId, '*', doc.reported_date], 1);
                } else {
                    emit([districtId, centerId, 'null_form', doc.reported_date], 1);
                    emit([valid, districtId, centerId, 'null_form', doc.reported_date], 1);
                }
            }
        }
    }
};

exports.data_records_valid_by_district_form_and_reported_date = {
    map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            dh;

        if(doc.type === 'data_record') {
            dh = objectpath.get(doc, 'related_entities.clinic.parent.parent');

            if (!dh) {
                dh = objectpath.get(doc, 'related_entities.health_center.parent');
            }

            if (dh && (!doc.errors || doc.errors.length === 0)) {
                emit([dh._id, doc.form, dh.name, doc.reported_date], 1);
            } else if (!doc.errors || doc.errors.length === 0) {
                emit([null, doc.form, null, doc.reported_date], 1);
            }
        }
    },
    reduce: function(key, counts) {
        return sum(counts);
    }
};

// only emit valid records
exports.data_records_valid_by_district_and_form = {
     map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            dh;

        if (doc.type === 'data_record') {
            dh = objectpath.get(doc, 'related_entities.clinic.parent.parent') || objectpath.get(doc, 'related_entities.health_center.parent');

            if (!doc.errors || doc.errors.length === 0) {
                if (dh) {
                    emit([dh._id, doc.form, dh.name], 1);
                } else {
                    emit([null, doc.form, null], 1);
                }
            }
        }
    },
    reduce: function(key, counts) {
        return sum(counts);
    }
};

exports.data_records_by_district = {
    map: function(doc) {
        var objectpath = require('views/lib/objectpath'),
            dh;

        if (doc.type === 'data_record') {
            dh = objectpath.get(doc, 'related_entities.clinic.parent.parent');

            if (dh && dh.type === 'district_hospital') {
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
        var objectpath = require('views/lib/objectpath'),
            dh,
            cl,
            contact;

        if (doc.type === 'data_record') {
            dh = objectpath.get(doc, 'related_entities.clinic.parent.parent');
            cl = objectpath.get(doc, 'related_entities.clinic');
            contact = objectpath.get(doc, 'related_entities.clinic.contact') || {};

            if (dh && dh.type === 'district_hospital') {
                emit([dh._id, cl._id, cl.name, contact.name || contact.rc_code || contact.phone], null);
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
        var objectpath = require('views/lib/objectpath'),
            dh;

        if (doc.type === 'data_record') {
            dh = objectpath.get(doc, 'doc.related_entities.clinic.parent.parent');

            if (dh) {
                emit([dh._id, doc.reported_date, doc._id], doc);
            } else {
                emit([null, doc.reported_date, doc._id], doc);
            }
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
        var objectpath = require('views/lib/objectpath'),
            dh;

        if (doc.type === 'data_record' && doc.patient_id) {
            dh = objectpath.get(doc, 'related_entities.clinic.parent.parent') || { _id: null };

            emit([dh._id, doc.patient_id, doc.reported_date, doc._id], doc);
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
        if (doc.type === 'clinic' || doc.type === 'health_center' || doc.type === 'district_hospital') {
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
        var objectpath = require('views/lib/objectpath'),
            phone = objectpath.get(doc, 'parent.contact.phone');

        if (doc.type === 'clinic' && phone) {
            emit([phone], doc);
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
            // keep refid case-insenstive since data is usually coming from SMS
            emit([String(doc.contact.rc_code).toUpperCase()], doc);
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
