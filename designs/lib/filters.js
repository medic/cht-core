exports.update_clinics = function(doc) {
    return doc.form &&
        doc.related_entities &&
        !doc.related_entities.clinic;
};

exports.update_scheduled_reports = function(doc) {
    return doc.form &&
        doc.year &&
        (doc.month || doc.week || doc.week_number) &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_birth_report = function(doc) {
    return doc.form === 'OBIR' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_emergency_report = function(doc) {
    return doc.form === 'OEMR' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_notifications = function(doc) {
    return doc.form === 'ONOT' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_registration = function(doc) {
    return doc.form === 'ORPT' &&
        doc.related_entities &&
        doc.related_entities.clinic &&
        !doc.patient_id;
};

exports.ohw_counseling = function(doc) {
    return doc.form === 'OAPC' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.twilio_message = function(doc) {
    var tasks = doc.tasks || [];

    return tasks.some(function(task) {
        return task.state === 'pending';
    });
};

/* documents where configuration changes live */
exports.config_docs = function(doc) {
    return doc._id === '_design/kujua-lite';
};

exports.update_sent_by = function(doc) {
    return doc.from && doc.type === 'data_record' && doc.sent_by === undefined;
}

exports.update_sent_forms = function(doc) {
    return doc.form &&
        doc.reported_date &&
        doc.related_entities &&
        doc.related_entities.clinic &&
        doc.related_entities.clinic._id;
}
