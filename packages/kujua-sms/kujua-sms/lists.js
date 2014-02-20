/**
 * List functions to be exported from the design doc.
 */

var _ = require('underscore'),
    _s = require('underscore-string'),
    utils = require('./utils'),
    moment = require('moment'),
    logger = require('kujua-utils').logger,
    jsonforms  = require('views/lib/jsonforms'),
    info = require('views/lib/appinfo'),
    objectpath = require('views/lib/objectpath');

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

/*
 * returns values after formatting
 */
var formatValues = exports.formatValues = function(keys, values, tz) {
    _.each(keys, function(key, idx) {
        if (key === 'reported_date') {
            values[idx] = formatDate(values[idx], tz);
        }
    });
    return values;
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

var getKeys = exports.getKeys = function(form) {
    return [
        '_id',
        'reported_date',
        'from',
        ['related_entities', ['clinic', ['contact', ['name']]]],
        ['related_entities', ['clinic', ['name']]],
        ['related_entities', ['clinic', ['parent', ['contact', ['name']]]]],
        ['related_entities', ['clinic', ['parent', ['name']]]],
        ['related_entities', ['clinic', ['parent', ['parent', ['name']]]]]
    ].concat(utils.getFormKeys(form));
};

function startExportHeaders(format, filename) {
    if (format === 'xml') {
        start({code: 200, headers: {
            'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
            'Content-Disposition': 'attachment; filename=' + filename
        }});
    } else {
        start({code: 200, headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename=' + filename
        }});
    }
};

function sendHeaderRow(format, labels, form, delimiter) {
    if (format === 'xml') {
        send('<?xml version="1.0" encoding="UTF-8"?>\n' +
             '<?mso-application progid="Excel.Sheet"?>\n' +
             '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
             ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
             ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
             ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n' +
             ' xmlns:html="http://www.w3.org/TR/REC-html40">\n' +
             '<Worksheet ss:Name="'+form+'"><Table>');
        send(utils.arrayToXML([labels]));
    } else {
        send(utils.arrayToCSV([labels], delimiter) + '\n');
    }
}

function sendValuesRow(vals, format, delimiter) {
    if (format === 'xml') {
        send(utils.arrayToXML([vals]) + '\n');
    } else {
        send(utils.arrayToCSV([vals], delimiter) + '\n');
    }
}

function sendClosing(format) {
    if (format === 'xml') {
        send('</Table></Worksheet></Workbook>');
    }
}

exports.export_messages = function (head, req) {
    var query = req.query,
        format = query.format || 'csv',
        appInfo = info.getAppInfo.call(this),
        dh_name = query.dh_name ? query.dh_name : 'null',
        filename = getFilename('null', dh_name, format),
        locale = query.locale || 'en',
        delimiter = locale === 'fr' ? '";"' : null;

    utils.info = appInfo; // replace fake info with real from context

    startExportHeaders(format, filename);

    var labels = [
        '_id',
        'reported_date',
        'from',
        'related_entities.clinic.contact.name',
        'related_entities.clinic.name',
        'related_entities.clinic.parent.contact.name',
        'related_entities.clinic.parent.name',
        'related_entities.clinic.parent.parent.name',
        'Message Type',
        'Message State',
        'Message Timestamp/Due',
        'Message UUID',
        'Sent By',
        'To Phone',
        'Message Body'
    ];

    if (format === 'xml') {
        send('<?xml version="1.0" encoding="UTF-8"?>\n' +
             '<?mso-application progid="Excel.Sheet"?>\n' +
             '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
             ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
             ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
             ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n' +
             ' xmlns:html="http://www.w3.org/TR/REC-html40">\n' +
             '<Worksheet ss:Name="Messages"><Table>');
    }

    if (!query.skip_header_row) {
        labels = _.map(labels, function(label) {
            return utils.info.translate(label, locale);
        });
        if (format === 'xml') {
            send(utils.arrayToXML([labels]));
        } else {
            send(utils.arrayToCSV([labels], delimiter) + '\n');
        }
    }

    function sendMessageRows(doc) {
        var tasks = [];
        // Normalize and combine incoming messages, responses, tasks and
        // scheduled_tasks into one array Note, auto responses will likely get
        // deprecated soon in favor of sentinel based messages.
        //
        // Normalized form:
        // {
        //  type: ['Auto Response', 'Incoming Message', <schedule name>, 'Task Message'],
        //  state: ['received', 'sent', 'pending', 'muted', 'scheduled', 'cleared'],
        //  timestamp/due: <date string>,
        //  messages: [{
        //      uuid: <uuid>,
        //      to: <phone>,
        //      message: <message body>
        //  }]
        // }
        if (doc.responses && doc.responses.length > 0) {
            tasks = tasks.concat({
                type: 'Auto Response',
                state: 'sent',
                timestamp: doc.reported_date,
                messages: doc.responses
            });
        }
        if (doc.tasks && doc.tasks.length > 0) {
            tasks = tasks.concat(doc.tasks);
        }
        if (doc.scheduled_tasks && doc.scheduled_tasks.length > 0) {
            tasks = tasks.concat(doc.scheduled_tasks);
        }
        // incoming msgs
        if (doc.sms_message && doc.sms_message.message) {
            tasks = tasks.concat({
                type: 'Incoming Message',
                state: 'received',
                timestamp: doc.reported_date,
                messages: [{
                    from: doc.from,
                    message: doc.sms_message.message
                }]
            });
        }
        _.each(tasks, function(task) {
            var vals = [
                doc._id,
                formatDate(doc.reported_date, query.tz),
                doc.from,
                objectpath.get(doc, 'related_entities.clinic.contact.name'),
                objectpath.get(doc, 'related_entities.clinic.name'),
                objectpath.get(doc, 'related_entities.clinic.parent.contact.name'),
                objectpath.get(doc, 'related_entities.clinic.parent.name'),
                objectpath.get(doc, 'related_entities.clinic.parent.parent.name'),
                task.type || 'Task Message',
                task.state,
                formatDate(task.timestamp || task.due, query.tz)
            ];
            _.each(task.messages, function(msg) {
                vals = vals.concat([
                    msg.uuid,
                    msg.sent_by,
                    msg.to,
                    msg.message
                ]);
            });
            // turn undefined into empty string for xml export
            vals = _.map(vals, function(val) {
                return typeof val === 'undefined' ? '' : val;
            });
            if (format === 'xml') {
                send(utils.arrayToXML([vals]));
            } else {
                send(utils.arrayToCSV([vals], delimiter) + '\n');
            }
        });
    };

    var row;
    while (row = getRow()) {
        if(row && row.doc) {
            sendMessageRows(row.doc);
        }
    }

    if (format === 'xml') {
        send('</Table></Worksheet></Workbook>');
    }

    return '';
};

function sendError(json, code) {
    start({
        code: code || 400,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
    send(JSON.stringify(json));
};

exports.export_data_records = function (head, req) {
    var labels,
        query = req.query,
        form  = query.form,
        format = query.format || 'csv',
        appInfo = info.getAppInfo.call(this),
        exclude_cols = query.exclude_cols ? query.exclude_cols.split(',') : [],
        dh_name = query.dh_name ? query.dh_name : 'null',
        filename = getFilename(form, dh_name, format),
        locale = query.locale || 'en', //TODO get from session
        delimiter = locale === 'fr' ? '";"' : null,
        rows,
        values,
        keys = exports.getKeys(form);

    utils.info = appInfo; // replace fake info with real from context

    startExportHeaders(format, filename);

    if (!query.startkey || !query.endkey) {
        return sendError({
            "error": "bad_request",
            "reason": "startkey and endkey parameters required"
        });
    }

    // exclude_cols params removes cols from export. takes 1-indexed comma
    // separated list as input. e.g 1,5
    if (exclude_cols.length > 0) {
        _.each(exclude_cols, function(num) {
            keys.splice(num-1, 1);
        });
    }

    // fetch labels for all keys
    labels = utils.getLabels(keys, form, locale);

    if (!query.skip_header_row) {
        sendHeaderRow(format, labels, form, delimiter);
    }

    while (row = getRow()) {
        if(row.doc) {
            // add values for each data record to the rows
            values = utils.getValues(row.doc, keys);
            // format date fields
            values = formatValues(keys, values, query.tz);
            sendValuesRow(values, format, delimiter);
        }
    }

    sendClosing(format);

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
