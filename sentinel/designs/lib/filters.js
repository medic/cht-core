exports.update_clinics = function(doc) {
    return doc.form &&
        doc.related_entities &&
        !doc.related_entities.clinic;
};

exports.ohw_anc_report = function(doc) {
    var transitions = require('filters/lib/transition');

    return !transitions.completed(doc, 'ohw_anc_report') &&
        doc.form === 'OANC' &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_pnc_report = function(doc) {
    var transitions = require('filters/lib/transition');

    return !transitions.completed(doc, 'ohw_pnc_report') &&
        doc.form === 'OPNC' &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_birth_report = function(doc) {
    var transitions = require('filters/lib/transition');

    return !transitions.completed(doc, 'ohw_birth_report') &&
        doc.form === 'OBIR' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_danger_sign = function(doc) {
    var transitions = require('filters/lib/transition');

    return !transitions.completed(doc, 'ohw_danger_sign') &&
        doc.form === 'ODGR' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_labor_report = function(doc) {
    var transitions = require('filters/lib/transition');

    return !transitions.completed(doc, 'ohw_labor_report') &&
        doc.form === 'OLAB' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_notifications = function(doc) {
    var transitions = require('filters/lib/transition');

    return !transitions.completed(doc, 'ohw_notifications') &&
        doc.form === 'ONOT' &&
        doc.patient_id &&
        doc.related_entities &&
        doc.related_entities.clinic;
};

exports.ohw_registration = function(doc) {
    var transitions = require('filters/lib/transition');

    return !transitions.completed(doc, 'ohw_registration') &&
        doc.form === 'ORPT' &&
        doc.related_entities &&
        doc.related_entities.clinic &&
        (!doc.patient_identifiers || doc.patient_identifiers.length === 0);
};

exports.twilio_message = function(doc) {
    var tasks = doc.tasks || [];

    return tasks.some(function(task) {
        return task.state === 'pending';
    });
};
