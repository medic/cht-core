/**
 * List functions to be exported from the design doc.
 */

var _ = require('underscore'),
    _s = require('underscore-string'),
    utils = require('./utils'),
    moment = require('moment'),
    kutils = require('kujua-utils'),
    appinfo = require('views/lib/appinfo'),
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
    if (!date) {
        return '';
    }
    // return in a specified timezone offset
    var result = moment(date);
    if (typeof tz !== 'undefined') {
        result = result.zone(Number(tz));
    }
    // return in UTC or browser/server preference/default
    return result.format('DD, MMM YYYY, HH:mm:ss Z');
};

/*
 * returns values after formatting
 */
var formatValues = exports.formatValues = function(keys, values, options) {
    _.each(keys, function(key, idx) {
        if (key === 'reported_date') {
            values[idx] = formatDate(values[idx], options.timezone);
        }
    });
    return values;
};

function getFilename(options) {
    var parts = [];
    if (options.dhName) {
        parts.push(options.dhName.replace(' ', ''));
    }
    if (options.formName) {
        parts.push(options.formName);
    }
    parts.push('data_records');
    return parts.join('_') + '.' + options.format;
}

function startExportHeaders(options, filename) {
    var mime = options.format === 'xml' ? 'application/vnd.ms-excel' : 'text/csv';
    start({code: 200, headers: {
        'Content-Type': mime + '; charset=utf-8',
        'Content-Disposition': 'attachment; filename=' + filename
    }});
};

function excludeColumns(columns, options) {
    // exclude_cols params removes cols from export. takes 1-indexed comma
    // separated list as input. e.g 1,5
    _.each(options.excludeColumns, function(idx) {
        columns.splice(idx - 1, 1);
    });
}

function sendHeaderRow(options, extraColumns) {
    var cols = _.map(options.columns, function(label) {
        return utils.info.translate(label, options.locale);
    });
    cols = cols.concat(extraColumns || []);
    excludeColumns(cols, options);

    if (options.format === 'xml') {
        var formName = _s.capitalize(options.formName || 'Reports');
        send('<?xml version="1.0" encoding="UTF-8"?>\n' +
             '<?mso-application progid="Excel.Sheet"?>\n' +
             '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n' +
             ' xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
             ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n' +
             ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n' +
             ' xmlns:html="http://www.w3.org/TR/REC-html40">\n' +
             '<Worksheet ss:Name="' + formName + '"><Table>');
        if (!options.skipHeader) {
            send(utils.arrayToXML([cols]));
        }
    } else if (!options.skipHeader) {
        send(utils.arrayToCSV([cols], options.delimiter) + '\n');
    }
}

function sendValuesRow(vals, options) {
    excludeColumns(vals, options);
    if (options.format === 'xml') {
        vals = _.map(vals, function(val) {
            return typeof val === 'undefined' ? '' : val;
        });
        send(utils.arrayToXML([vals]) + '\n');
    } else {
        send(utils.arrayToCSV([vals], options.delimiter) + '\n');
    }
}

function sendClosing(options) {
    if (options.format === 'xml') {
        send('</Table></Worksheet></Workbook>');
    }
}

function getOptions(req, formName, defaultColumns) {
    var query = req.query;
    var options = {
        format: query.format,
        dhName: query.dh_name,
        locale: query.locale,
        delimiter: query.locale === 'fr' ? '";"' : null,
        skipHeader: query.skip_header_row,
        timezone: query.tz,
        columns: query.columns ? JSON.parse(query.columns) : defaultColumns,
        formName: formName
    };
    if (query.filter_state) {
        options.filterState = {
            state: query.filter_state
        };
        if (query.filter_state_from) {
            options.filterState.from = 
                moment().add(query.filter_state_from, 'days').startOf('day');
        }
        if (query.filter_state_to) {
            options.filterState.to = 
                moment().add(query.filter_state_to, 'days').endOf('day')
        }

    }
    if (query.exclude_cols) {
        options.excludeColumns = _.sortBy(
            query.exclude_cols.split(','),
            function(num) { 
                // must exclude in reverse order or the pos keeps changing
                return -1 * num;
            }
        );
    }
    _.defaults(options, {
        format: 'csv',
        locale: 'en',
        skipHeader: false
    });
    return options;
}

exports.export_messages = function (head, req) {

    if (!kutils.hasPerm(req.userCtx, 'can_export_messages')) {
        log('messages export sending 403');
        start({code: 403});
        return send('');
    }

    utils.info = appinfo.getAppInfo.call(this); // replace fake info with real from context

    var options = getOptions(req, 'messages', [
        '_id',
        'patient_id',
        'reported_date',
        'from',
        'related_entities.clinic.contact.name',
        'related_entities.clinic.name',
        'related_entities.clinic.parent.contact.name',
        'related_entities.clinic.parent.name',
        'related_entities.clinic.parent.parent.name',
        'task.type',
        'task.state',
        'received',
        'scheduled',
        'pending',
        'sent',
        'cleared',
        'muted'
    ]);

    startExportHeaders(options, getFilename(options));
    sendHeaderRow(options, ['Message UUID', 'Sent By', 'To Phone', 'Message Body']);

    function getStateDate(state, task, history) {
        if (state === 'scheduled' && task.due) {
            return task.due;
        }
        if (history[state]) {
            return history[state];
        }
        if (task.state === state) {
            return task.timestamp;
        }
        return;
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
                state_history: [{
                    state: 'sent',
                    timestamp: doc.reported_date
                }],
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
                state_history: [{
                    state: 'received',
                    timestamp: doc.reported_date
                }],
                messages: [{
                    sent_by: doc.from,
                    message: doc.sms_message.message
                }]
            });
        }
        _.each(tasks, function(task) {
            var history = {};
            _.each(task.state_history, function(item) {
                history[item.state] = item.timestamp;
            });

            if (options.filterState) {
                var filter = options.filterState;
                var state = history[filter.state];
                if (!state) {
                     // task hasn't been in the required state
                    return;
                }
                var stateTimestamp = getStateDate(filter.state, task, history);
                if (!stateTimestamp) {
                     // task has no timestamp
                    return;
                }
                stateTimestamp = moment(stateTimestamp);
                if (filter.from && stateTimestamp.isBefore(filter.from)) {
                    // task is earlier than filter period start
                    return;
                }
                if (filter.to && stateTimestamp.isAfter(filter.to)) {
                    // task is later than filter period end
                    return;
                }
            }
            var vals = _.map(options.columns, function(column) {
                var value;
                var date = false;
                if (_.contains(['received', 'scheduled', 'pending', 'sent', 'cleared', 'muted'], column)) {
                    // check the history
                    value = getStateDate(column, task, history);
                    date = true;
                } else if (column === 'task.type') {
                    value = task.type || 'Task Message';
                } else if (_s.startsWith(column, 'task.')) {
                    value = objectpath.get(task, column.substring(5));
                } else {
                    // otherwise just check the doc
                    value = objectpath.get(doc, column);
                    date = _.contains(['reported_date'], column);
                }
                if (date) {
                    value = formatDate(value, options.timezone);
                }
                return value;
            });

            _.each(task.messages, function(msg) {
                vals = vals.concat([
                    msg.uuid,
                    msg.sent_by,
                    msg.to,
                    msg.message
                ]);
            });

            sendValuesRow(vals, options);
        });
    };

    var row;
    while (row = getRow()) {
        if(row && row.doc) {
            sendMessageRows(row.doc);
        }
    }

    sendClosing(options);

    return '';
};


exports.export_feedback = function (head, req) {

    if (!kutils.hasPerm(req.userCtx, 'can_export_feedback')) {
        log('feedback export sending 403');
        start({code: 403});
        return send('');
    }

    utils.info = appinfo.getAppInfo.call(this); // replace fake info with real from context

    var options = getOptions(req, 'feedback');

    options.columns = [
        '_id',
        'reported_date',
        'User',
        'App Version',
        'URL',
        'Info',
        'Log'
    ];

    var filename = _s.sprintf(
        'feedback-%s.%s',
        moment().format('YYYYMMDDHHmm'),
        options.format
    );

    startExportHeaders(options, filename);
    sendHeaderRow(options);

    var row;
    while (row = getRow()) {
        var doc = row.doc;
        if (doc) {
            sendValuesRow([
                doc._id,
                formatDate(doc.meta.time, options.timezone),
                doc.meta.user.name,
                doc.meta.version,
                doc.meta.url,
                safeStringify(doc.info),
                safeStringify(doc.log)
            ], options);
        }
    }

    sendClosing(options);

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

    if (!kutils.hasPerm(req.userCtx, 'can_export_forms')) {
        log('data records export sending 403');
        start({code: 403});
        return send('');
    }

    utils.info = appinfo.getAppInfo.call(this); // replace fake info with real from context

    var form = req.query.form;
    var options = getOptions(req, form, [
        '_id',
        'patient_id',
        'reported_date',
        'from',
        'related_entities.clinic.contact.name',
        'related_entities.clinic.name',
        'related_entities.clinic.parent.contact.name',
        'related_entities.clinic.parent.name',
        'related_entities.clinic.parent.parent.name'
    ]);
    startExportHeaders(options, getFilename(options));
    var extraColumns;
    if (req.query.columns) {
        extraColumns = [];
    } else if (form) {
        extraColumns = utils.getFormKeys(utils.info.getForm(form));
    } else {
        extraColumns = ['form'];
    }
    sendHeaderRow(options, utils.getLabels(extraColumns, form, options.locale));
    options.columns = options.columns.concat(extraColumns);

    var row;
    while (row = getRow()) {
        if(row.doc) {
            var values = utils.getValues(row.doc, options.columns);
            sendValuesRow(
                formatValues(options.columns, values, options),
                options
            );
        }
    }

    sendClosing(options);

    return '';
};

var safeStringify = function(obj) {
    try {
        return JSON.stringify(obj);
    } catch(e) {
        return obj;
    }
};

exports.export_audit = function (head, req) {

    if (!kutils.hasPerm(req.userCtx, 'can_export_audit')) {
        log('audit export sending 403');
        start({code: 403});
        return send('');
    }

    utils.info = appinfo.getAppInfo.call(this); // replace fake info with real from context

    var options = getOptions(req, 'audit');
    options.columns = [
        '_id',
        'Type',
        'Timestamp',
        'Author',
        'Action',
        'Document'
    ];
    
    var filename = _s.sprintf(
        'audit-%s.%s',
        moment().format('YYYYMMDDHHmm'), 
        options.format
    );

    startExportHeaders(options, filename);
    sendHeaderRow(options);

    var row;
    while (row = getRow()) {
        if (row.doc) {
            _.each(row.doc.history, function(rev) {
                var vals = [
                    row.doc.record_id,
                    rev.doc.type,
                    formatDate(rev.timestamp, options.timezone),
                    rev.user,
                    rev.action,
                    JSON.stringify(rev.doc)
                ];
                sendValuesRow(vals, options);
            });
        }
    }

    sendClosing(options);

    return '';
};

/**
 * @param {String} phone - phone number of the phone sending the referral (from)
 * @param {Object} clinic - facility object of type 'clinic'
 * @returns {Boolean} - Return true if the phone number is the health center.
 * @api private
 */
var isFromHealthCenter = function(phone, clinic) {
    return clinic.parent && 
        clinic.parent.contact && 
        clinic.parent.contact.phone === phone;
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
        app_settings = appinfo.getAppInfo.call(this),
        def = app_settings.getForm(form),
        facility  = null;

    utils.info = app_settings; // replace fake info with real from context

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
    if (!facility && !(def && def.public_form) && !app_settings.public_access) {
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
                        kutils.setTaskState(task, 'sent');
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
                            kutils.setTaskState(task, 'sent');
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
