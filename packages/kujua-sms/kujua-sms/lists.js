/**
 * List functions to be exported from the design doc.
 */

var _ = require('underscore')._,
    utils = require('./utils'),
    logger = utils.logger,
    smsforms = require('views/lib/smsforms');

var strings = {
    gateway: {
        sent_timestamp: {
            en: 'Sent Timestamp',
            fr: 'Date envoyé'
        },
        from: {
            en: 'From',
            fr: 'Envoyé par'
        }
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
        headings.unshift(strings.gateway.from[locale]);
        headings.unshift(strings.gateway.sent_timestamp[locale]);

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
        headings.unshift(strings.gateway.from[locale]);
        headings.unshift(strings.gateway.sent_timestamp[locale]);

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
    if (phone === clinic.parent.contact.phone) {
        return true;
    }
    return false;
};



/**
 * @param {String} form - form key
 * @param {String} phone - phone number of the sending phone (from)
 * @param {Object} clinic - facility object of type 'clinic'
 * @returns {String} - Return phone number of where the referral should go to.
 * @api private
 */
var getRecipientPhone = exports.getRecipientPhone = function(form, phone, clinic) {
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
        case 'MSBB':
            // Health Center -> Hospital
            return clinic.parent.parent.contact.phone;
        default:
            // Not sure what to do here
            return '';
    };
};



/**
 * @param {String} form - smsforms form key
 * @param {String} phone - Phone number of where the message is *from*.
 * @param {Object} form_data - parsed form data that includes labels (format:1)
 * @param {Object} clinic - the clinic from the tasks_referral doc
 *
 * @returns {String} Return referral message formated as string.
 *
 * @api private
 */
var getReferralMessage = function(form, phone, form_data, clinic) {
    var ignore = [],
        message = [];
    switch (form) {
        case 'MSBC':
            if (isFromHealthCenter(phone, clinic))
                ignore.push('cref_treated');
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


/**
 * @param {String} form - smsforms form key
 * @param {String} phone - Phone number of where the message is *from*.
 * @param {Object} form_data - parsed form data that includes labels (format:1)
 * @param {Object} clinic - the clinic from the tasks_referral doc
 *
 * @returns {Object} Return referral task object for later processing
 *
 * @api private
 */
var getReferralTask = function(form, phone, form_data, clinic) {
    logger.debug(['getReferralTask arguments', arguments]);
    var to = getRecipientPhone(form, phone, clinic),
        task = {
            type: 'referral',
            state: 'pending',
            to: to,
            messages: [{
                to: to,
                message: getReferralMessage(form, phone, form_data, clinic)}]};
    return task;
};

/**
 * @param {Object} req - Kanso request object
 * @param {String} form - smsforms key string
 * @param {Object} form_data - parsed form data
 * @param {Object} clinic - clinic facility object
 * @returns {String} - Path for callback
 * @api private
 */
var getCallbackPath = function(req, form, form_data, clinic) {
    logger.debug(['lists.getCallbackPath arguments', arguments]);
    
    var path = '',
        appdb = require('duality/core').getDBURL(req),
        baseURL = require('duality/core').getBaseURL();

    if(!clinic) {
        return path;
    }

    if (smsforms.isReferralForm(form)) {
        path = appdb;
    } else {
        path = baseURL + smsforms[form].data_record_merge
                  .replace(':form', encodeURIComponent(form))
                  .replace(':year', encodeURIComponent(form_data.year[0]))
                  .replace(':month', encodeURIComponent(form_data.month[0]))
                  .replace(':clinic_id', encodeURIComponent(clinic._id));
    }

    return path;
};


var addError = function(obj, error) {
    obj.errors.push(error);
    logger.error(error);
};

var json_headers = {
    'Content-Type': 'application/json; charset=utf-8'
};


/*
 * Second step of adding a data record for an incoming SMS.
 * This adds the clinic to the data record data and
 * returns the necessary callback information for
 * creating the data record.
 *
 * @param {Object} head
 * @param {Object} req
 *
 * @returns {String} response body
 *
 * @api public
 */
exports.data_record = function (head, req) {
    start({code: 200, headers: json_headers});
    logger.debug(['data_record arguments', arguments]);

    var record = JSON.parse(req.body),
        form = req.query.form,
        headers = req.headers.Host.split(":"),
        host = headers[0],
        port = headers[1] || "",
        appdb = require('duality/core').getDBURL(req),
        def = smsforms[form],
        clinic = null;

    record.created = new Date(); // used in views for sorting

    /* Panic */
    if (!def) {
        addError(task, {error: 'No form definition found for '+ form +'.'});
    }

    /* Add clinic to task */
    var row = {};
    while (row = getRow()) {
        clinic = record.related_entities.clinic = row.value;
        break;
    }

    /* Can't do much without a clinic */
    if (!clinic) {
        addError(record, {error: "Clinic not found."});
    } else if (smsforms.isReferralForm(form)) {
        record.tasks.push(
            getReferralTask(
                form,
                record.from,
                record.form_data,
                record.related_entities.clinic));
    }

    /* Send callback to gateway to check for already existing doc. */
    var respBody = {
        callback: {
            options: {
                host: host,
                port: port,
                path: getCallbackPath(req, form, record.form_data, clinic),
                method: "POST",
                headers: _.clone(json_headers)},
            data: record}};

    // pass through Authorization header
    if(req.headers.Authorization) {
        respBody.callback.options.headers.Authorization = req.headers.Authorization;
    }

    return JSON.stringify(respBody);
};


/*
 * Third step of adding a data record for an incoming SMS.
 * If a data record for the year/month/clinic already exists
 * this merges the data and sends a callback to update it,
 * if no data record exists, it sends a callback to create
 * a new data record.
 *
 * @param {Object} head
 * @param {Object} req
 *
 * @returns {String} response body
 *
 * @api public
  */
exports.data_record_merge = function (head, req) {
    start({code: 200, headers: json_headers});
    logger.debug(['data_record_merge arguments', arguments]);

    var new_data_record = JSON.parse(req.body),
        form = req.query.form,
        headers = req.headers.Host.split(":"),
        host = headers[0],
        port = headers[1] || "",
        def = smsforms[form],
        appdb = require('duality/core').getDBURL(req),
        old_data_record = null,
        path = appdb,
        row = {};

    /* Panic */
    if (!def) {
        addError(task, {error: 'No form definition found for '+ form +'.'});
    }

    while (row = getRow()) {
        old_data_record = row.value;
        break;
    }

    if(old_data_record) {
        path += '/' + old_data_record._id;
        new_data_record._id = old_data_record._id;
        new_data_record._rev = old_data_record._rev;
    };

    /* Send callback to gateway to save the doc. */
    var respBody = {
        callback: {
            options: {
                host: host,
                port: port,
                path: path,
                method: old_data_record ? "PUT" : "POST",
                headers: _.clone(json_headers)},
            data: new_data_record}};

    // pass through Authorization header
    if(req.headers.Authorization) {
        respBody.callback.options.headers.Authorization = req.headers.Authorization;
    }

    return JSON.stringify(respBody);
};



/*
 * Respond to smssync task polling, callback does a bulk update to update the
 * state field of tasks.
 */
exports.tasks_pending = function (head, req) {
    start({code: 200, headers: json_headers});

    var newDocs = [],
        appdb = require('duality/core').getDBURL(req),
        headers = req.headers.Host.split(":"),
        host = headers[0],
        port = headers[1] || "",
        respBody = {
            payload: {
                success: true,
                task: "send",
                secret: "",
                messages: []}};

    var row = [];
    while (row = getRow()) {
        var doc = row.doc;

        // update state attribute for the bulk update callback
        for (var i in doc.tasks) {
            if (doc.tasks[i].state === 'pending') {
                doc.tasks[i].state = 'sent';
                // append outgoing message data payload for smsssync
                respBody.payload.messages.push.apply(
                        respBody.payload.messages,
                        doc.tasks[i].messages);
            }
        }

        newDocs.push(doc);
    }

    if (newDocs.length) {
        respBody.callback = {
            options: {
                host: host,
                port: port,
                path: appdb + '/_bulk_docs',
                method: "POST",
                headers: json_headers},
            // bulk update
            data: {docs: newDocs}
        }
    }

    return JSON.stringify(respBody)
};
