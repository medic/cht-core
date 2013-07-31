/**
 * List functions to be exported from the design doc.
 */

var _ = require('underscore'),
    _s = require('underscore-string'),
    utils = require('./utils'),
    moment = require('moment'),
    logger = require('kujua-utils').logger,
    jsonforms  = require('views/lib/jsonforms'),
    info = require('views/lib/appinfo');


// default properties to export from record
var EXPORT_KEYS = [
    'reported_date',
    'from',
    ['related_entities', ['clinic', ['contact', ['name']]]],
    ['related_entities', ['clinic', ['name']]],
    ['related_entities', ['clinic', ['parent', ['contact', ['name']]]]],
    ['related_entities', ['clinic', ['parent', ['name']]]],
    ['related_entities', ['clinic', ['parent', ['parent', ['name']]]]]
];

var formatDate = function(msecs) {
    return moment(msecs).format('DD, MMM YYYY, HH:mm:ss Z');
};

function getFilename(form, name, type) {
    var filename;

    if (form === 'null') {
        form = 'messages';
    }

    filename = _s.sprintf('%s_data_records.%s', form, type);

    if (name !== 'null') {
        name = name.replace(' ', '');
        filename = name + '_' + filename;
    }
    return filename;
}

exports.getKeys = function(form) {
    if (form === 'null') {
        // add message content and to of *first* message
        keys = [].concat(EXPORT_KEYS);
        keys.push(['tasks', ['0', ['messages', ['0', ['to']]]]]);
        keys.push(['tasks', ['0', ['messages', ['0', ['message']]]]]);
    } else {
        // add form keys from form def
        keys = EXPORT_KEYS.concat(utils.getFormKeys(form));
    }
    return keys;
};

exports.data_records_csv = function (head, req) {
    var labels,
        query = req.query,
        form  = query.form,
        appInfo = info.getAppInfo.call(this),
        dh_name = query.dh_name ? query.dh_name : 'null',
        filename = getFilename(form, dh_name, 'csv'),
        locale = query.locale || 'en', //TODO get from session
        delimiter = locale === 'fr' ? '";"' : null,
        rows,
        values,
        keys = exports.getKeys(form);

    utils.info = appInfo; // replace fake info with real from context

    start({code: 200, headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
    }});

    // fetch labels for all keys
    labels = utils.getLabels(keys, form, locale);

    if (!query.skip_header_row)
        send(utils.arrayToCSV([labels], delimiter) + '\n');

    while (row = getRow()) {
        if(row.doc) {
            // add values for each data record to the rows
            values = utils.getValues(row.doc, keys);
            values[0] = formatDate(values[0]);
            send(utils.arrayToCSV([values], delimiter) + '\n');
        }
    }

    return '';
};

exports.data_records_xml = function (head, req) {
    var query = req.query,
        form  = query.form,
        dh_name = query.dh_name ? query.dh_name : 'null',
        appInfo = info.getAppInfo.call(this),
        filename = getFilename(form, dh_name, 'xml'),
        locale = query.locale || 'en', //TODO get from session
        rows,
        values,
        labels,
        keys = exports.getKeys(form);

    // replace info on utils with "real" one
    utils.info = appInfo;

    start({code: 200, headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
    }});

    // fetch labels for all keys
    var labels = utils.getLabels(keys, form, locale);

    var row = [],
        values;

    send('<?xml version="1.0" encoding="UTF-8"?>\n' +
         '<?mso-application progid="Excel.Sheet"?>\n' +
         '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
         ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
         ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
         ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n' +
         ' xmlns:html="http://www.w3.org/TR/REC-html40">\n' +
         '<Worksheet ss:Name="'+form+'"><Table>');

    send(utils.arrayToXML([labels]));

    while (row = getRow()) {
        values = utils.getValues(row.doc, keys);
        values[0] = formatDate(values[0]);
        send(utils.arrayToXML([values]));
    }

    send('</Table></Worksheet></Workbook>');

    return '';
};


/**
 * @param {String} phone - phone number of the phone sending the referral (from)
 * @param {Object} clinic - facility object of type 'clinic'
 * @returns {Boolean} - Return true if the phone number is the health center.
 * @api private
 */
var isFromHealthCenter = function(phone, clinic) {
    if (!clinic.parent || !clinic.parent.contact) { return false; }
    if (phone === clinic.parent.contact.phone) {
        return true;
    }
    return false;
};



/**
 * @param {String} form - form key
 * @param {String} phone - phone number of the sending phone (from)
 * @param {Object} clinic - facility object of type 'clinic'
 * @returns {String} - Return phone number of where the referral should go to
 *                     or empty string.
 *
 * @api private
 */
exports.old_getRecipientPhone = function(form, phone, clinic) {
    if (!clinic.parent || !clinic.parent.contact) { return ''; }
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
            // No recipient could be resolved for form
            return '';
    }
};
var old_getRecipientPhone = exports.old_getRecipientPhone;

/**
 * @param {String} form
 * @param {String} phone
 * @param {Object} clinic
 * @param {Object} record
 *
 * @returns {String} Return referral message formated as string.
 *
 * @api private
 */
var old_getReferralMessage = function(form, phone, clinic, record) {
    var ignore = [],
        message = [],
        keys = utils.getFormKeys(form),
        labels = utils.getLabels(keys, form),
        values = utils.getValues(record, keys);


    if(form === "MSBC") {
        if (isFromHealthCenter(phone, clinic)) {
            ignore.push('cref_treated');
        }
    }

    _.each(keys, function(key) {
        if (ignore.indexOf(key) === -1) {
            message.push(labels.shift() + ': ' + values.shift());
        } else {
            labels.shift();
            values.shift();
        }
    });

    return message.join(', ');
};

/**
 * @param {String} form - jsonforms form key
 * @param {String} phone - Phone number of where the message is *from*.
 * @param {Object} form_data - parsed form data that includes labels (format:1)
 * @param {Object} clinic - the clinic from the tasks_referral doc
 *
 * @returns {Object} Return referral task object
 *
 * @api private
 */
var old_getReferralTask = function(form, record) {
    var phone = record.from,
        form_data = record.form_data,
        clinic = record.related_entities.clinic,
        task = {
            state: 'pending',
            messages: [{
                to: old_getRecipientPhone(form, phone, clinic),
                message: old_getReferralMessage(form, phone, clinic, record)
            }]
        };

    return task;
};

var json_headers = {
    'Content-Type': 'application/json; charset=utf-8'
};


/*
 * Second step of adding a data record for an incoming SMS.  This function
 * returns the necessary callback information to update the data record with
 * facility data.
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

    var _id = JSON.parse(req.body).uuid,
        record = {related_entities: {}},
        form = req.query && req.query.form,
        headers = req.headers.Host.split(":"),
        baseURL = require('duality/core').getBaseURL(),
        def = jsonforms[form],
        facility  = null,
        appInfo = info.getAppInfo.call(this);

    utils.info = appInfo; // replace fake info with real from context

    //
    // Add first matched facility to record
    //
    var row = {};
    while (row = getRow()) {
        if (row.value.type === 'clinic') {
            record.related_entities.clinic = row.value;
            facility = row.value;
            break;
        }
        if (row.value.type === 'health_center') {
            record.related_entities.clinic = {parent: row.value};
            facility = row.value;
            break;
        }
        if (row.value.type === 'district_hospital') {
            record.related_entities.clinic = {parent: { parent: row.value}};
            facility = row.value;
            break;
        }
    }

    // no facility, not a public form, and not a public_access install
    if (!facility && !(def && def.public_form) && !appInfo.public_access) {
        utils.addError(record, 'sys.facility_not_found');
    }

    var respBody = {
        callback: {
            options: {
                host: headers[0],
                port: headers[1] || "",
                path: baseURL + '/data_record/update/' + _id,
                method: "PUT",
                headers: _.clone(json_headers)
            },
            data: record
        }
    };

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
        includeDoc,
        host = headers[0],
        port = headers[1] || "",
        row,
        includeDoc,
        doc;

    var respBody = {
        payload: {
            success: true,
            task: "send",
            secret: "",
            messages: []
        }
    };

    while (row = getRow()) {
        doc = row.doc;

        // update state attribute for the bulk update callback
        // don't process tasks that have no to field since we can't send a
        // message and we don't want to mark the task as sent.  TODO have
        // better support in the gateway for tasks so the gateway can verify
        // that it processed the task successfully.
        includeDoc = false;
        _.each(doc.tasks, function(task) {
            if (task.state === 'pending') {
                _.each(task.messages, function(msg) {
                    // if to: field is defined then append messages
                    if (msg.to) {
                        task.state = 'sent';
                        task.timestamp = new Date().getTime();

                        // append outgoing message data payload for smsssync
                        respBody.payload.messages.push(msg);
                        includeDoc = true;
                    }
                });
            }
        });

        if (includeDoc) {
            newDocs.push(doc);
        }
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
        };
    }

    // pass through Authorization header
    if(req.headers.Authorization && respBody.callback) {
        respBody.callback.options.headers.Authorization = req.headers.Authorization;
    }

    return JSON.stringify(respBody);
};
