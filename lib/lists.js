/**
 * List functions to be exported from the design doc.
 */

var smsforms = require('views/lib/smsforms'),
    smsparser = require('views/lib/smsparser'),
    _ = require('underscore')._,
    utils = require('lib/utils');

var gateway = {
    sent_timestamp: {
        en: 'Sent Timestamp',
        fr: 'Date envoyé'
    },
    from: {
        en: 'From',
        fr: 'Envoyé par'
    }
};

exports.sms_messages_csv = function (head, req) {

    var formKey  = req.query.form;
        def = smsforms[formKey ],
        filename = def ? formKey  + '_sms_messages.csv': 'unknown_form.csv',
        locale = req.query.locale || 'en',
        delimiter = locale === 'fr' ? '";"' : null;

    start({code: 200, headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
        //'Content-Disposition': 'attachment; filename="testit.csv";'+
        //  'filename*=UTF-8\'\'testit.csv'
    }});

    var row, rows = [];
    while (row = getRow()) {
        rows.push(row);
    }

    if (def) {
        var headings = _.map(def.fields, function (r) {
            return r.label || r.key;
        });
        headings.unshift(gateway.from[locale]);
        headings.unshift(gateway.sent_timestamp[locale]);

        var data = _.map(rows, function(r) {
            return r.value ? r.value : '';
        });
        data.unshift(headings);
        // Prepend BOM for MS Excel compat
        return '\uFEFF' + utils.arrayToCSV(data, delimiter);
    }

    // It would be nice to do a 404 page here, but we've already started the
    // request with a 200 response and test/csv mime type - thanks couch!
    // At the top of this function the filename is set to unknown_form.csv
    // when the form def can't be found
    return '';
};

exports.sms_messages_xml = function (head, req) {

    var formKey = req.query.form,
        form = smsforms[formKey],
        filename = form ? formKey + '_sms_messages.xml': 'unknown_form.xml',
        locale = req.query.locale || 'en';

    start({code: 200, headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
    }});

    var row, rows = [];
    while (row = getRow()) {
        rows.push(row);
    }

    if (form) {
        var headings = _.map(form.fields, function (r) {
            return r.label || r.key;
        });
        headings.unshift(gateway.from[locale]);
        headings.unshift(gateway.sent_timestamp[locale]);

        var data = _.map(rows, function(r) {
            return r.value ? r.value : '';
        });
        data.unshift(headings);
        return '<?xml version="1.0" encoding="UTF-8"?>\n' +
            // tells windows to auto-associate with excel
            '<?mso-application progid="Excel.Sheet"?>\n' +
            '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
            ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
            ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
            ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n' +
            ' xmlns:html="http://www.w3.org/TR/REC-html40">\n' +
            '<Worksheet ss:Name="'+formKey+'"><Table>' +
            utils.arrayToXML(data) +
            '</Table></Worksheet></Workbook>';
    }

    // It would be nice to do a 404 page here, but we've already started the
    // request with a 200 response and test/csv mime type - thanks couch!
    // At the top of this function the filename is set to unknown_form.csv
    // when the form def can't be found
    return '';
};

var getReferralRecipient = function(clinic, formKey) {
    switch (formKey) {
        case 'MSBR':
            // Clinic -> Health Center
            return clinic.parent.contact.phone;
        case 'MSBC':
            // Health Center -> Clinic (or) Hospital -> Health Center
            return 'form.cref_rc';
        case 'MSBB':
            // Health Center -> Hospital
            return clinic.parent.parent.contact.phone';
    }
};

/*
 * 2nd phase of tasks_referral processing.  Add clinic, to, and messages fields
 * to doc, then send callback data for gateway to execute.
 */
exports.tasks_referral = function (head, req) {

    start({code: 200, headers: {
        'Content-Type': 'application/json; charset=utf-8'
    }});

    var task = JSON.parse(req.form),
        task.created = new Date(),
        form = req.form;
        def = smsforms[form];

    if (!def) {
        return '{' +
            '"error": "No form definition found for '+ form +'."}';
    }

    /* Add clinic to task */
    var row = {};
    while (row = getRow()) {
        task.clinic = row.value;
        break;
    }

    if (!task.clinic) {
        task.errors.push('error: clinic not found.');
    }

    /* Send callback to gateway to save the doc. */
    var respBody = {
        callback: {
            options: {
                host: "localhost",
                port: 5984,
                path: '/kujua/',
                method: "POST",
                headers: {'Content-Type': 'application/json; charset=utf-8'}},
            data: task}};

    return JSON.stringify(respBody)

};

/*
 * Respond to smssync task polling, callback does a bulk update to update the
 * state field of tasks_referral docs to 'complete'.
 */
exports.tasks_referral_pending = function (head, req) {

    start({code: 200, headers: {
        'Content-Type': 'application/json; charset=utf-8'
    }});

    var row, newDocs = [],
        respBody = {
            // smssync format
            payload: {
                task: "send",
                secret: "sssshhh-it",
                messages: []}};

    /**
     * @param {Object} form - parsed form definition, with labels (format:1)
     * @param {String} formKey - smsforms key
     * @returns {String} Message data that goes to referral recipient
     * @api private
     */
    var getReferralMessage = function(task) {
        var ignore, message = [];
        switch (formKey) {
            case 'MSBC':
                // TODO only ignore this field if coming from health_center
                // ignore = ['cref_treated'];
            default:
                for (k in form) {
                    var val = form[k];
                    if (ignore.indexOf(k) === -1)
                        message.push(val[1] + ': ' + val[0]);
                }
                return message.join(', ');
        }
    };

    while (row = getRow()) {
        var task = row.value;
        respBody.payload.messages.push({
            to: row.value.to,
            message: _.map(row.value.data, function(r){
                return r[1]+': '+r[0];
            }).join(', ')
        });
        // update state attribute for the bulk update callback
        row.doc.state = 'complete';
        newDocs.push(row.doc);
    }

    if (newDocs.length) {
        respBody.callback = {
            options: {
                host: "localhost",
                port: 5984,
                path: '/kujua/_bulk_docs',
                method: "POST",
                headers: {'Content-Type': 'application/json; charset=utf-8'}},
            // bulk update
            data: {docs: newDocs}
        }
    }

    return JSON.stringify(respBody)
};
