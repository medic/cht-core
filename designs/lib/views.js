exports.patient_ids_by_form_clinic_and_reported_date = {
    map: function(doc) {
        if (!doc.patient_id
            || !doc.reported_date
            || !doc.contact
            || !doc.contact.parent
            || !doc.form) return;
        var cl_id = doc.contact.parent._id;
        emit([doc.form, doc.patient_id, cl_id, doc.reported_date], null);
    }
};

exports.serial_numbers_by_form_clinic_and_reported_date = {
    map: function(doc) {
        if (!doc.serial_number
            || !doc.reported_date
            || !doc.contact
            || !doc.contact.parent
            || !doc.form) return;
        var cl_id = doc.contact.parent._id;
        emit([doc.form, doc.serial_number, cl_id, doc.reported_date], null);
    }
};

exports.due_tasks = {
    map: function(doc) {
        var tasks = doc.scheduled_tasks || [];

        tasks.forEach(function(task, index) {
            if (task.due && task.state === 'scheduled') {
                emit(task.due, task);
            }
        });
    }
};

/*
 * Get clinic based on phone number
 */
exports.clinic_by_phone = {
    map: function(doc) {
        if (doc.type === 'clinic' && doc.contact && doc.contact.phone) {
            emit([doc.contact.phone], null);
        }
    }
};

/*
 * Get clinic based on reference id
 */
exports.clinic_by_refid = {
    map: function (doc) {
        if (doc.type === 'clinic' && doc.contact && doc.contact.rc_code) {
            // need String because rewriter wraps everything in quotes
            emit([String(doc.contact.rc_code)], null);
        }
    }
};

exports.person_by_phone = {
    map: function (doc) {
        if (doc.type === 'person') {
            emit([doc.phone], null);
        }
    }
};

exports.registered_patients = {
    map: function(doc) {
        if (doc.form &&
            (!doc.errors || doc.errors.length === 0) &&
            doc.patient_id &&
            doc.transitions &&
            doc.transitions.registration &&
            doc.transitions.registration.ok ) {
                emit(String(doc.patient_id), null);
        }
    }
}

exports.data_records_by_form_year_week_clinic_id_and_reported_date = {
    map: function (doc) {
        if (doc.type === 'data_record'
                && doc.contact
                && doc.contact.parent
                && doc.year
                && (doc.week || doc.week_number)
                && doc.form
                && doc.reported_date) {
            emit([
                doc.form,
                doc.year,
                doc.week || doc.week_number,
                doc.contact.parent._id,
                doc.reported_date
            ], null);
        }
    }
};

exports.data_records_by_form_year_month_clinic_id_and_reported_date = {
    map: function (doc) {
        if (doc.type === 'data_record'
                && doc.contact
                && doc.contact.parent
                && doc.year
                && doc.month
                && doc.form
                && doc.reported_date) {
            emit([
                doc.form,
                doc.year,
                doc.month,
                doc.contact.parent._id,
                doc.reported_date
            ], null);
        }
    }
};

exports.data_records_by_form_and_clinic = {
    map: function(doc) {
        if (doc.type === 'data_record' 
            && doc.form 
            && doc.contact
            && doc.contact.parent) {
            emit([
                doc.form,
                doc.contact.parent._id
            ], null);
        }
    }
};

exports.sent_reminders = {
    map: function(doc) {
        if (Array.isArray(doc.tasks)) {
            doc.tasks.forEach(function(task) {
                if (task.code && task.ts) {
                    emit([task.code, task.ts], null);
                }
            });
        }
    }
}

