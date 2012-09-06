/**
 * List functions to be exported from the design doc.
 */

var _ = require('underscore')._,
    utils = require('./utils'),
    strings = utils.strings,
    moment = require('moment'),
    logger = require('kujua-utils').logger,
    jsonforms  = require('views/lib/jsonforms');


// default properties to export from record
var EXPORT_KEYS = [
    'reported_date',
    'from',
    ['related_entities', ['clinic', ['contact', ['name']]]],
    ['related_entities', ['clinic', ['name']]],
    ['related_entities', ['clinic', ['parent', ['contact', ['name']]]]],
    ['related_entities', ['clinic', ['parent', ['name']]]]
];

var formatDate = function(msecs) {
    return moment(msecs).format('DD, MMM YYYY, HH:mm:ss Z');
};

exports.data_records_csv = function (head, req) {
    var labels,
        query = req.query,
        form  = query.form,
        kansoconfig = query.kansoconfig ? JSON.parse(query.kansoconfig) : {},
        dh_name = query.dh_name ? query.dh_name : 'null',
        filename = dh_name.replace(' ','') + '_' + form + '_data_records.csv',
        locale = query.locale || 'en', //TODO get from session
        delimiter = locale === 'fr' ? '";"' : null,
        rows,
        values,
        keys = [];

    start({code: 200, headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
    }});

    // add form keys from form def
    keys = EXPORT_KEYS.concat(utils.getFormKeys(form));

    // fetch labels for all keys
    labels = utils.getLabels(keys, form, locale);
    labels = _.map(labels, function(label) {
      return kansoconfig[label] || label;
    });

    send('\uFEFF');
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
        kansoconfig = query.kansoconfig ? JSON.parse(query.kansoconfig) : {},
        filename = dh_name.replace(' ','') + '_' + form + '_data_records.xml',
        locale = query.locale || 'en', //TODO get from session
        rows,
        values,
        labels,
        // extra doc fields we want to export not in form
        keys = [];

    start({code: 200, headers: {
        'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
    }});

    // add form keys from form def
    keys = EXPORT_KEYS.concat(utils.getFormKeys(form));

    // fetch labels for all keys
    var labels = utils.getLabels(keys, form, locale);
    labels = _.map(labels, function(label) {
      return kansoconfig[label] || label;
    });

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
exports.getRecipientPhone = function(form, phone, clinic) {
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
var getRecipientPhone = exports.getRecipientPhone;

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
var getReferralMessage = function(form, phone, clinic, record) {
    var ignore = [],
        message = [];

    if(form === "MSBC") {
        if (isFromHealthCenter(phone, clinic)) {
            ignore.push('cref_treated');
        }
    }

    var keys = utils.getFormKeys(form);
    var labels = utils.getLabels(keys, form);
    var values = utils.getValues(record, keys);

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
var getReferralTask = function(form, record) {
    var phone = record.from,
        form_data = record.form_data,
        clinic = record.related_entities.clinic,
        to = getRecipientPhone(form, phone, clinic),
        task = {
            type: 'referral',
            state: 'pending',
            messages: [{
                to: to,
                message: getReferralMessage(form, phone, clinic, record)
            }]
        };

    return task;
};

/**
 * @param {Object} req - kanso request object
 * @param {String} form - jsonforms key string
 * @param {Object} record - record
 * @param {Object} facility - facility object
 *
 * @returns {String} - path for callback
 *
 * @api private
 */
var getCallbackPath = function(req, form, record, facility) {
    var appdb = require('duality/core').getDBURL(req),
        baseURL = require('duality/core').getBaseURL(),
        path = appdb;

    if(!facility || !form || !record || !jsonforms[form]) {
        return path;
    }

    if (utils.isReferralForm(form) || !jsonforms[form].data_record_merge) {
        return path;
    }

    // parse data_record_merge attribute for field names and replace
    var matches = jsonforms[form].data_record_merge.match(/(:\w*)/g),
        updateURL = jsonforms[form].data_record_merge;

    for (var i in matches) {
        var key = matches[i].replace(':','');
        if (record[key]) {
            updateURL = updateURL.replace(
                            matches[i], encodeURIComponent(record[key]));
        }
    }

    return baseURL + updateURL
        .replace(':clinic_id', facility._id)
        .replace(':facility_id', facility._id)
        .replace(':form', encodeURIComponent(form));

};


var addError = function(obj, error) {
    obj.errors.push(error);
    logger.error(error);
};

var json_headers = {
    'Content-Type': 'application/json; charset=utf-8'
};


/*
 * Second step of adding a data record for an incoming SMS.  This adds the
 * related data to the record and returns the necessary callback information
 * for creating the data record.
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

    var record = JSON.parse(req.body),
        form = req.query.form,
        headers = req.headers.Host.split(":"),
        host = headers[0],
        port = headers[1] || "",
        appdb = require('duality/core').getDBURL(req),
        def = jsonforms[form],
        facility  = null;

    if (!def) {
        var err = {code: 'form_not_found', form: form};
        err.message = utils.getMessage(err);
        addError(record, err);
    }

    //
    // setup related_entities
    //
    record.related_entities = {
        clinic: {
            parent: {
                parent: {}
            }
        }
    };

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
            record.related_entities.clinic.parent = row.value;
            facility = row.value;
            break;
        }
        if (row.value.type === 'district_hospital') {
            record.related_entities.clinic.parent.parent = row.value;
            facility = row.value;
            break;
        }
    }

    /* Can't do much without a facility */
    if (!facility) {
        var err = {code: 'facility_not_found'};
        err.message = utils.getMessage(err);
        addError(record, err);
    } else if (utils.isReferralForm(form)) {
        var task = getReferralTask(form, record);
        record.tasks.push(task);
        for (var i in task.messages) {
            var msg = task.messages[i];
            if(!msg.to) {
                var err = {code: 'recipient_not_found'};
                err.message = utils.getMessage(err);
                addError(record, err);
                // we don't need redundant error messages
                break;
            }
        }
    }

    /* Send callback to gateway to check for already existing doc. */
    var respBody = {
        callback: {
            options: {
                host: host,
                port: port,
                path: getCallbackPath(req, form, record, facility),
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

    var new_data_record = JSON.parse(req.body),
        form = req.query.form,
        headers = req.headers.Host.split(":"),
        host = headers[0],
        port = headers[1] || "",
        def = jsonforms[form],
        appdb = require('duality/core').getDBURL(req),
        old_data_record = null,
        path = appdb,
        row = {};

    if (!def) {
        var err = {code: 'form_not_found', form: form};
        err.message = utils.getMessage(err);
        addError(new_data_record, err);
    }

    while (row = getRow()) {
        old_data_record = row.value;
        break;
    }

    if(old_data_record) {
        path += '/' + old_data_record._id;
        new_data_record._id = old_data_record._id;
        new_data_record._rev = old_data_record._rev;
    }

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
        doc,
        headers = req.headers.Host.split(":"),
        includeDoc,
        host = headers[0],
        port = headers[1] || "",
        respBody,
        row = [];

        respBody = {
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
