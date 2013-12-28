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

/*
 * @param {Number|String} date is Unix timestamp or ISO compatible string
 *
 * @param {Number|String} tz is timezone offset value in minutes to GMT as
 * returned by new Date().getTimezoneOffset(), e.g. -120
 *
 * @returns {String} formatted date
 *
 * @api public
 */
var formatDate = exports.formatDate = function(date, tz) {
    // standard format for exports
    var fmt = 'DD, MMM YYYY, HH:mm:ss Z';
    // return in a specified timezone offset
    if (typeof tz !== 'undefined') {
        return moment(date).zone(Number(tz)).format(fmt);
    }
    // return in UTC or browser/server preference/default
    return moment(date).format(fmt);
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
        // add message content and to of *first* message for non-structured
        // message records
        keys = [].concat(EXPORT_KEYS);
        //keys.push(['tasks', ['0', ['messages', ['0', ['to']]]]]);
        //keys.push(['tasks', ['0', ['messages', ['0', ['message']]]]]);
        //keys.push(['tasks', ['0', ['state']]]);
        //keys.push(['tasks', ['0', ['timestamp']]]);
    } else {
        // add form keys from form def
        keys = EXPORT_KEYS.concat(utils.getFormKeys(form));
    }
    //keys.push(['sms_message',['message']]);
    //keys.push('responses');
    //keys.push('tasks');
    //keys.push('scheduled_tasks');
    return keys;
};

exports.messages_csv = function (head, req) {
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
            values[0] = formatDate(values[0], query.tz);
            send(utils.arrayToCSV([values], delimiter) + '\n');
        }
    }

    return '';
};

exports.messages_xml = function (head, req) {
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
        values[0] = formatDate(values[0], query.tz);
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
        def = jsonforms.getForm(form),
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
        // don't process tasks that have no `to` field since we can't send a
        // message and we don't want to mark the task as sent.  TODO have
        // better support in the gateway for tasks so the gateway can verify
        // that it processed the task successfully.
        includeDoc = false;
        _.each(doc.tasks, function(task) {
            if (task.state === 'pending') {
                _.each(task.messages, function(msg) {
                    // if to and message is defined then append messages
                    if (msg.to && msg.message) {
                        task.state = 'sent';
                        task.timestamp = new Date().toISOString();
                        // append outgoing message data payload for smsssync
                        respBody.payload.messages.push(msg);
                        includeDoc = true;
                    }
                });
            }
        });

        // only process scheduled tasks if doc has no errors.
        if (!doc.errors || doc.errors.length === 0) {
            _.each(doc.scheduled_tasks || [], function(task) {
                if (task.state === 'pending') {
                    _.each(task.messages, function(msg) {
                        // if to and message is defined then append messages
                        if (msg.to && msg.message) {
                            task.state = 'sent';
                            task.timestamp = new Date().toISOString();
                            // append outgoing message data payload for smsssync
                            respBody.payload.messages.push(msg);
                            includeDoc = true;
                        }
                    });
                }
            });
        }

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

exports.facilities_select2 = function(head, req) {
    start({code: 200, headers: {
        'Content-Type': 'text/json; charset=utf-8'
    }});

    row = getRow();

    if (!row) {
        return send('[]');
    }

    function getData() {
        var names = [],
            //support include_docs=true
            doc = row.doc || row.value;

        if (doc.name) {
            names.unshift(doc.name);
            if (doc.parent && doc.parent.name) {
                names.unshift(doc.parent.name);
                if (doc.parent.parent && doc.parent.parent.name) {
                    names.unshift(doc.parent.parent.name);
                }
            }
        }

        return {
            text: names.join(', '),
            id: row.id
        };
    }

    // create array of facilities as valid JSON output, no comma at end.  also
    // format nicely incase someone wants to modify it and re-upload.
    send('[');
    send(JSON.stringify(getData()));
    while (row = getRow()) {
        send(',\n');
        send(JSON.stringify(getData()));
    }
    send(']');

}
