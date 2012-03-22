
// also sorts by reported_date
exports.data_records_valid_by_district_and_form = {
    map: function(doc) {
        if(doc.type.match(/data_record/)) {
            var smsforms = require('views/lib/smsforms'),
                def = smsforms[doc.form],
                title = def ? def.title : null;
            if (doc.related_entities.clinic
                    && doc.related_entities.clinic.parent
                    && doc.related_entities.clinic.parent.parent
                    && doc.errors.length === 0) {
                var dh = doc.related_entities.clinic.parent.parent;
                emit([dh._id, doc.form, dh.name, title], 1);
            }
        }
    },

    reduce: function(key, counts) {
        return sum(counts);
    }
};

exports.data_records_by_reported_date = {
    map: function(doc) {
        if (doc.type.match(/data_record/)) {
            var date = parseInt(doc.reported_date, 10) * -1;
            if (doc.related_entities.clinic) {
                var dh = doc.related_entities.clinic.parent.parent;
                emit([dh._id, date, doc._id], doc);
            } else {
                emit([null, date, doc._id], doc);
            }
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
            emit([String(doc.refid), doc.reported_date], doc.clinic);
        }
    }
};

exports.tasks_pending = {
    map: function (doc) {
        if (doc.tasks && doc.tasks.length) {
            for (var i in docs.tasks) {
                if (doc.tasks[i].state === 'pending') {
                    emit([doc.reported_date, doc.refid]);
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
