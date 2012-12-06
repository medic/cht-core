exports.update_clinics = function(doc) {
    return doc.form &&
        doc.related_entities &&
        !doc.related_entities.clinic;
};

exports.ohw_anc_report = function(doc) {
    return doc.form === 'OANC' &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_pnc_report = function(doc) {
    return doc.form === 'OPNC' &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_birth_report = function(doc) {
    return doc.form === 'OBIR' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_danger_sign = function(doc) {
    return doc.form === 'ODGR' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_labor_report = function(doc) {
    return doc.form === 'OLAB' &&
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
        (!doc.patient_identifiers || doc.patient_identifiers.length === 0);
};
