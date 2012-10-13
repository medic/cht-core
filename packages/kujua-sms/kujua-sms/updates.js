/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore')._,
    logger = require('kujua-utils').logger,
    jsonforms = require('views/lib/jsonforms'),
    smsparser = require('views/lib/smsparser'),
    validate = require('./validate'),
    utils = require('./utils');


/**
 * @param {String} form - jsonforms key string
 * @param {Object} form_data - parsed form data
 * @returns {String} - Reporting Unit ID value
 * @api private
 */
var getRefID = function(form, form_data) {
    var def = jsonforms[form];

    if (!def || !def.facility_reference)
        return;

    return form_data[def.facility_reference];
};

/**
 * @param {String} phone - phone number of the sending phone (from)
 * @param {Object} doc - sms_message doc created from initial POST
 * @param {Object} form_data - parsed form data
 * @returns {Object} - body for callback
 * @api private
 */
var getCallbackBody = function(phone, doc, form_data) {
    var type = 'data_record',
        form = doc.form,
        def = jsonforms[form];

    var body = {
        type: type,
        from: phone,
        form: form,
        related_entities: {clinic: null},
        errors: [],
        responses: [],
        tasks: [],
        reported_date: new Date().getTime(),
        // keep message datat part of record
        sms_message: doc
    };

    // try to parse timestamp from gateway
    var ts = parseSentTimestamp(doc.sent_timestamp);
    if (ts)
        body.reported_date = ts;

    if (def) {
        if (def.facility_reference)
            body.refid = form_data[def.facility_reference];

        for (var k in def.fields) {
            var field = def.fields[k];
            smsparser.merge(form, k.split('.'), body, form_data);
        }
        body.errors = validate.validate(def, form_data);
    }

    if (form_data && form_data._extra_fields)
        body.errors.push({code: "extra_fields"});

    return body;
};

/**
 * @param {String} phone - phone number of the sending phone (from)
 * @param {String} form - jsonforms key string
 * @param {Object} form_data - parsed form data
 * @returns {String} - Path for callback
 * @api private
 */
var getCallbackPath = function(phone, form, form_data, def) {

    def = def ? def : jsonforms[form];

    // if the definition has use_sentinel:true, shortcut
    if (def && def.use_sentinel)
        return '/_db';

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
 * return unix timestamp string or undefined
 */
var parseSentTimestamp = function(str) {
    if(!str) { return; }
    var match = str.match(/(\d{1,2})-(\d{1,2})-(\d{2})\s(\d{1,2}):(\d{2})(:(\d{2}))?/),
        ret,
        year;
    if (match) {
        ret = new Date();

        year = ret.getFullYear();
        year -= year % 100; // round to nearest 100
        ret.setYear(year + parseInt(match[3], 10)); // works until 2100

        ret.setMonth(parseInt(match[1],10) - 1);
        ret.setDate(parseInt(match[2], 10));
        ret.setHours(parseInt(match[4], 10));
        ret.setMinutes(match[5]);
        ret.setSeconds(match[7] || 0);
        ret.setMilliseconds(0);
        return ret.getTime();
    }
};

/*
 * Return Ushahidi SMSSync compatible response message.  Supports custom
 * auto-reply message in the form definition. Also uses callbacks to create
 * 1st phase of doc creation.
 */
var getRespBody = function(doc, req) {
    var form = doc.form,
        form_data = null,
        def = jsonforms[form],
        baseURL = require('duality/core').getBaseURL(),
        headers = req.headers.Host.split(":"),
        host = headers[0],
        port = headers[1] || "",
        phone = doc.from, // set by gateway
        autoreply = utils.getMessage('success', doc.locale),
        errormsg = '',
        resp = {
            //smssync gateway response format
            payload: {
                success: true,
                task: "send",
                messages: [{
                    to: phone,
                    message: autoreply}]}};

    if (!doc.message || !doc.message.trim()) {
        errormsg = utils.getMessage('empty', doc.locale);
    }

    if (errormsg) {
        // TODO integrate with kujua notifications?
        resp.payload.messages[0].message = errormsg;
        logger.error({'error':errormsg, 'doc':doc, 'resp':resp});
        return JSON.stringify(resp);
    }

    if (!def) {
        // this defines the message is unstructured
        form = undefined;
    } else {
        form_data = smsparser.parse(def, doc);
        if (def.autoreply)
            resp.payload.messages[0].message = def.autoreply;
    }

    // provide callback for next part of record creation.
    resp.callback = {
        options: {
            host: host,
            port: port,
            method: "POST",
            headers: {'Content-Type': 'application/json; charset=utf-8'}
        }
    };

    resp.callback.options.path = baseURL + getCallbackPath(phone, form, form_data, def);
    resp.callback.data = getCallbackBody(phone, doc, form_data);

    // process errors and create payload object for SMSSync replies
    if(resp.callback.data.errors.length > 0) {
        resp.payload.messages[0].message = _.map(resp.callback.data.errors, function(err) {
            return utils.getMessage(err, doc.locale);
        }).join(', ');
    }

    // save responses to record
    resp.callback.data.responses = resp.payload.messages;

    // pass through Authorization header
    if(req.headers.Authorization) {
        resp.callback.options.headers.Authorization = req.headers.Authorization;
    }

    return JSON.stringify(resp);
};
exports.getRespBody = getRespBody;

/*
 * Parse an sms message and if we discover a supported format save a data
 * record.
 */
exports.add_sms = function (doc, req) {
    return [null, getRespBody(_.extend(req.form, {
        type: "sms_message",
        locale: (req.query && req.query.locale) || 'en',
        form: smsparser.getForm(req.form.message)
    }), req)];
};

exports.add = function (doc, req) {
};
