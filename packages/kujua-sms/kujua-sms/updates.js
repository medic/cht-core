/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore'),
    moment = require('moment'),
    logger = require('kujua-utils').logger,
    info = require('views/lib/appinfo'),
    smsparser = require('views/lib/smsparser'),
    validate = require('./validate'),
    utils = require('./utils');


/**
 * @param {String} form - form code
 * @param {Object} form_data - parsed form data
 * @returns {String} - Reporting Unit ID value (case insensitive)
 * @api private
 */
var getRefID = function(form, form_data) {

    var def = utils.info.getForm(form),
        val;

    if (!def || !def.facility_reference)
        return;

    val = form_data && form_data[def.facility_reference];

    if (val && typeof val.toUpperCase === 'function')
        return val.toUpperCase();

    return val;
};

/**
 * @param {String} phone - phone number of the sending phone (from)
 * @param {Object} doc - sms_message doc created from initial POST
 * @param {Object} form_data - parsed form data
 * @returns {Object} - data record
 * @api private
 */
function getDataRecord(doc, form_data) {

    var form = doc.form,
        def = utils.info.getForm(form);

    var record = {
        _id: req.uuid,
        type: 'data_record',
        from: doc.from,
        form: form,
        related_entities: {clinic: null},
        errors: [],
        tasks: [],
        reported_date: parseSentTimestamp(doc.sent_timestamp) || new Date().valueOf(),
        // keep message data part of record
        sms_message: doc
    };

    function isMessageEmpty() {
        return !doc.message || !doc.message.trim();
    }

    if (isMessageEmpty()) {
        utils.addError(record, 'sys.empty');
        record.tasks.push({
            state: 'pending',
            messages: [{
                to: doc.from,
                message: utils.info.translate('empty', doc.locale)
            }]
        });
    }

    // if form is undefined but we have message content then treat as
    // unstructured message and add proper error response.
    if (!def && !isMessageEmpty()) {
        if (utils.info.forms_only_mode) {
            utils.addError(record, 'sys.form_not_found');
            record.tasks.push({
                state: 'pending',
                messages: [{
                    to: doc.from,
                    message: utils.info.translate('form_not_found', doc.locale)
                }]
            });
        } else {
            record.form = undefined;
            record.tasks.push({
                state: 'pending',
                messages: [{
                    to: doc.from,
                    message: utils.info.translate('sms_received', doc.locale)
                }]
            });
        }
    }

    if (def) {
        if (def.facility_reference) {
            record.refid = getRefID(form, form_data);
        }

        for (var k in def.fields) {
            var field = def.fields[k];
            smsparser.merge(form, k.split('.'), record, form_data);
        }
        var errors = validate.validate(def, form_data);
        errors.forEach(function(err) {
            utils.addError(record, err);
        });
    }

    if (form_data && form_data._extra_fields) {
        utils.addError(record, 'extra_fields');
    }

    return record;
};

/**
 * @param {String} phone - phone number of the sending phone (from)
 * @param {String} form - forms key string
 * @param {Object} form_data - parsed form data
 * @returns {String} - Path for callback
 * @api private
 */
var old_getCallbackPath = function(phone, form, form_data, def) {

    def = def ? def : utils.info.getForm(form);

    if (!form) {
        // find a match with a facility's phone number
        return '/data_record/add/facility/%2'
                    .replace('%2', encodeURIComponent(phone));
    }

    if (def && def.facility_reference) {
        return '/%1/data_record/add/refid/%2'
                  .replace('%1', encodeURIComponent(form))
                  .replace('%2', encodeURIComponent(
                      getRefID(form, form_data)));
    }

    // find a match with a facility's phone number
    return '/%1/data_record/add/facility/%2'
                .replace('%1', encodeURIComponent(form))
                .replace('%2', encodeURIComponent(phone));
};

/*
 * Try to parse SMSSync gateway sent_timestamp field and use it for
 * reported_date.  Particularly useful when re-importing data from gateway to
 * maintain accurate reported_date field.
 *
 * return unix timestamp integer or undefined
 */
var parseSentTimestamp = function(str) {

    if(!str) { return; }

    // smssync 1.1.9 format
    var match1 = str.match(/(\d{1,2})-(\d{1,2})-(\d{2})\s(\d{1,2}):(\d{2})(:(\d{2}))?/),
        ret,
        year;

    if (match1) {
        ret = new Date();

        year = ret.getFullYear();
        year -= year % 100; // round to nearest 100
        ret.setYear(year + parseInt(match1[3], 10)); // works until 2100

        ret.setMonth(parseInt(match1[1],10) - 1);
        ret.setDate(parseInt(match1[2], 10));
        ret.setHours(parseInt(match1[4], 10));
        ret.setMinutes(match1[5]);
        ret.setSeconds(match1[7] || 0);
        ret.setMilliseconds(0);
        return ret.valueOf();
    }

    // smssync 2.0 format (ms since epoch)
    var match2 = str.match(/(\d{13,})/);

    if (match2) {
        ret = new Date(Number(match2[1]));
        return ret.valueOf();
    }

    // otherwise leave it up to moment lib
    return moment(str).valueOf();
};

/*
 * @param {Object} doc - data_record object as returned from getDataRecord
 * @returns {Object} - smssync gateway response payload json object
 * @api private
 *
 * Form validation errors are included in doc.errors.
 * Always limit outgoing message to 160 chars and only send one message.
 *
 */
var old_getSMSResponse = function(doc) {
    var locale = doc.sms_message && doc.sms_message.locale,
        msg = utils.info.translate('sms_received', locale),
        def = doc.form && utils.info.getForm(doc.form),
        res = {
            success: true,
            task: "send",
            messages: [{
                to: doc.from,
                message: msg
            }]
        };

    // looks like we parsed a form ok
    if (def) {
        if (doc.errors.length === 0) {
            msg = utils.info.translate('form_received', locale);
        }

        // we have a custom success autoreply
        if (def.autoreply) {
            msg = def.autoreply;
        }
    }

    // process errors array, create a response message for certain errors states
    // that go back to reporter.  error codes like 'sys.facility_not_found' only
    // go to admins, but we do look for 'facility_not_found' which is ok
    // for an SMS client.
    doc.errors.forEach(function(err) {
        if (/sys\./.test(err.code)) {
            var user_error_code = err.code.replace('sys.','');
            var m = utils.info.translate(user_error_code, locale)
                    .replace('{{form}}', doc.form)
                    .replace('{{fields}}', err.fields && err.fields.join(', '));
            // only send error message if defined and had a translation,
            // translate will return the key if there are no translations
            // defined.
            if (m && user_error_code !== m) {
                msg = m;
            }
        } else {
            // default, use code if it's available
            msg = utils.info.translate(err.code || err, locale);
        }
    });

    /*
     * If we have no facility and it is required then include error response
     * otherwise if facility is not required and that is only error, then form
     * is valid.
     */
    if (def) {
        if (def.facility_required) {
            if (utils.hasError(doc, 'sys.facility_not_found')) {
                msg = utils.info.translate('reporting_unit_not_found', locale);
            }
        } else if (doc.errors.length === 1) {
            if (utils.hasError(doc, 'sys.facility_not_found')) {
                msg = utils.info.translate('form_received', locale);
            }
        }
    } else {
        // filter out facility not found
        doc.errors = _.reject(doc.errors, function(err) {
            return 'sys.facility_not_found' === err.code;
        });
    }

    if (msg.length > 160) {
        msg = msg.substr(0,160-3) + '...';
    }

    if (msg) {
        res.messages[0].message = msg;
    } else {
        res = getDefaultResponse(doc);
    }

    return res;
}

/*
 * Setup context and run eval on `messages_task` property on form.
 *
 * @param {String} form - form key
 * @param {Object} record - Data record object
 *
 * @returns {Object|undefined} - the task object or undefined if we have no
 *                               messages/nothing to send.
 *
 */
var old_getMessagesTask = function(record) {
    var def = utils.info.getForm(record.form),
        phone = record.from,
        clinic = record.related_entities.clinic,
        keys = utils.getFormKeys(def),
        labels = utils.getLabels(keys, record.form),
        values = utils.getValues(record, keys),
        task = {
            state: 'pending',
            messages: []
        };
    if (typeof def.messages_task === 'string')
        task.messages = task.messages.concat(eval('('+def.messages_task+')()'));
    if (task.messages.length > 0)
        return task;
};

function getDefaultResponse(doc) {
    var response = {
        payload: {
            success: true
        }
    };

    if (doc && doc._id) {
        response.payload.id = doc._id;
    }

    return response;
}

/*
 * Create intial/stub data record. Return Ushahidi SMSSync compatible callback
 * response to update facility data in next response.
 */
var req = {};
exports.add_sms = function(doc, request, _info) {

    req = request;
    utils.info = _info ? _info : info.getAppInfo.call(this);

    var sms_message = {
        type: "sms_message",
        form: smsparser.getFormCode(req.form.message)
    };
    sms_message = _.extend(req.form, sms_message);

    // if locale was not passed in form data then check query string
    if (!sms_message.locale) {
        sms_message.locale = (req.query && req.query.locale) || 'en'
    }

    var form_data = null,
        baseURL = require('duality/core').getBaseURL(),
        headers = req.headers.Host.split(":"),
        def = utils.info.getForm(sms_message.form),
        resp;

    if (sms_message.form && def) {
        form_data = smsparser.parse(def, sms_message);
    }

    // creates base record
    doc = getDataRecord(sms_message, form_data);
    resp = getDefaultResponse(doc);

    // by default related entities are null so also include errors on the record.
    if (!def || !def.public_form) {
        doc.errors.push({
            code: "sys.facility_not_found",
            message: utils.info.translate("sys.facility_not_found", sms_message.locale)
        });
    }

    return [doc, JSON.stringify(resp)];

    /*
     * removed callbacks support on add_sms

    // provide callback for next part of record creation.
    resp.callback = {
        options: {
            host: headers[0],
            port: headers[1] || "",
            method: "POST",
            headers: {'Content-Type': 'application/json; charset=utf-8'},
            path: baseURL
                    + getCallbackPath(sms_message.from, def && sms_message.form, form_data, def)
        },
        data: {uuid: req.uuid}
    };

    // pass through Authorization header
    if(req.headers.Authorization) {
        resp.callback.options.headers.Authorization = req.headers.Authorization;
    }

    // create doc and send response
    return [doc, JSON.stringify(resp)];
    */
};


/*
 * Update data record properties and create message tasks.
 */
exports.old_updateRelated = function(doc, request) {

    utils.info = info.getAppInfo.call(this);
    req = request;

    var data = JSON.parse(req.body),
        def = utils.info.getForm(doc.form),
        resp = {};

    doc.related_entities = doc.related_entities || {clinic: null};

    for (var k in data) {
        if (doc[k] && doc[k].length) {
            doc[k].concat(data[k]);
        } else {
            doc[k] = data[k];
        }
    }

    if (def && def.messages_task) {
        var task = getMessagesTask(doc);
        if (task) {
            doc.tasks = doc.tasks ? doc.tasks : [];
            doc.tasks.push(task);
            for (var i in task.messages) {
                var msg = task.messages[i];
                // check task fields are defined
                if(!msg.to) {
                    utils.addError(doc, 'sys.recipient_not_found');
                    // resolve one error at a time.
                    break;
                }
            }
        }
    }

    var new_errors = [];

    // remove errors if we have a clinic
    if (doc.related_entities.clinic && doc.related_entities.clinic !== null) {
        for (var i in doc.errors) {
            var err = doc.errors[i];
            if (err.code !== "sys.facility_not_found")
                new_errors.push(err);
        };
        doc.errors = new_errors;
    }

    // smssync-compat sms response
    resp.payload = getSMSResponse(doc, utils.info);

    // save response to record
    doc.responses = _.filter(resp.payload.messages, function(message) {
        return message.to !== utils.info.gateway_number;
    });

    return [doc, JSON.stringify(resp)];
};
