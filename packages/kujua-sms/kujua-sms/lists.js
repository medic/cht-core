var _ = require('underscore')._,
    utils = require('./utils'),
    smsforms = require('views/lib/smsforms'),
    smsparser = require('views/lib/smsparser');

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
    var formKey = req.query.form,
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














/**
 * @param {String} phone - phone number of the phone sending the referral (from)
 * @param {Object} clinic - facility object of type 'clinic'
 * @returns {Boolean} - Return true if the phone number is the health center.
 * @api private
 */
var isFromHealthCenter = function(phone, clinic) {
    if (phone === clinic.parent.contact.phone) { return true; }
    return false;
};

/**
 * @param {String} form - form key
 * @param {String} phone - phone number of the sending phone (from)
 * @param {Object} clinic - facility object of type 'clinic'
 * @returns {String} - Return phone number of where the referral should go to.
 * @api private
 */
var getRecipientPhone = function(form, phone, clinic) {
    switch (form) {
        case 'MSBR':
            // Clinic -> Health Center
            return clinic.parent.contact.phone;
        case 'MSBC':
            // Health Center -> Clinic (or) Hospital -> Health Center
            if (isFromHealthCenter(phone, clinic)) {
                return clinic.contact.phone;
            } else {
                // default to health center TODO check with abbyad
                return clinic.parent.contact.phone;
            }
            break;
        case 'MSBB':
            // Health Center -> Hospital
            return clinic.parent.parent.contact.phone;
        default:
            // Not sure what to do here
            return '';
    }
};

/**
 * @param {String} phone - Phone number of where the message is *from*.
 * @param {String} form - smsforms form key
 * @param {Object} form_data - parsed form data that includes labels (format:1)
 * @param {Object} clinic - the clinic from the tasks_referral doc
 *
 * @returns {String} Return referral message formated as string.
 *
 * @api private
 */
var getReferralMessage = function(phone, form, form_data, clinic) {
    var ignore = [],
        message = [];
    switch (form) {
        case 'MSBC':
            if (isFromHealthCenter(phone, clinic)) {
                ignore.push('cref_treated');
            }
            break;
        default:
            for (var k in form_data) {
                var val = form_data[k];
                if (ignore.indexOf(k) === -1) {
                    message.push(val[1] + ': ' + val[0]);
                }
            }
            return message.join(', ');
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

    var task = JSON.parse(req.body),
        form = req.query.form,
        def = smsforms[form];

    task.created = new Date();

    /* Panic */
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

    /* Append errors if necessary */
    if (!task.clinic) {
        task.errors.push('error: clinic not found.');
    }

    task.to = getRecipientPhone(task.form, task.from, task.clinic);
    task.messages.push({
        to: task.to,
        message: getReferralMessage(
            task.from, task.form, task.form_data, task.clinic)});

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

    return JSON.stringify(respBody);
};


/*
 * Respond to smssync task polling, callback does a bulk update to update the
 * state field of tasks_referral docs to 'complete'.
 */
exports.tasks_referral_pending = function (head, req) {
    start({code: 200, headers: {
        'Content-Type': 'application/json; charset=utf-8'
    }});

    var newDocs = [],
        respBody = {
            // smssync format
            payload: {
                task: "send",
                secret: "sssshhh-it",
                messages: []}};

    var row = [];
    while (row = getRow()) {
        var task = row.doc;
        // update state attribute for the bulk update callback
        task.state = 'sent';
        respBody.payload.messages.push.apply(
                respBody.payload.messages,
                task.messages);
        newDocs.push(task);
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
        };
    }

    return JSON.stringify(respBody);
};
