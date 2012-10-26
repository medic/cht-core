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
    var form = doc.form,
        def = jsonforms[form];

    var body = {
        type: 'data_record',
        from: phone,
        form: form,
        related_entities: {clinic: null},
        errors: [],
        responses: [],
        tasks: [],
        reported_date: new Date().getTime(),
        // keep message data part of record
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
        var errors = validate.validate(def, form_data);
        errors.forEach(function(err) {
            utils.addError(body, err);
        });
    } else {
        utils.addError(body, 'form_not_found_sys');
    }

    if (form_data && form_data._extra_fields)
        utils.addError(body, 'extra_fields');

    if (!doc.message || !doc.message.trim())
        utils.addError(body, 'empty_sys');

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
 * @param {Object} doc - data_record object as returned from getCallbackBody
 * @returns {Object} - smssync gateway response payload json object
 * @api private
 *
 * Form validation errors are included in doc.errors.
 * Always limit outgoing message to 160 chars and only send one message.
 *
 */
var getSMSResponse = function(doc) {

    var locale = doc.sms_message.locale,
        msg = utils.getMessage('sms_received', locale),
        def = doc.form && jsonforms[doc.form],
        res = {
            success: true,
            task: "send",
            messages: [{
                to: doc.from,
                message: msg
            }]
        };

    // looks like we parsed a form ok
    if (def && doc.errors.length === 0)
        msg = utils.getMessage('form_received', locale);

    // we have a custom success autoreply
    if (def && def.autoreply)
        msg = def.autoreply;

    // handle validation errors
    doc.errors.forEach(function(err) {
        // default
        msg = utils.getMessage(err, locale);
        // special overrides where we want the system message to be different
        // from the client side message
        if (err.code === 'form_not_found_sys') {
            msg = utils.getMessage('form_not_found', locale)
                    .replace('%(form)', doc.form);
        }
        if (err.code === 'empty_sys')
            msg = utils.getMessage('empty', locale);
    });

    if (msg.length > 160)
        msg = msg.substr(0,160-3) + '...';

    res.messages[0].message = msg;

    return res;

};

/*
 * Return Ushahidi SMSSync compatible response message.  Supports custom
 * auto-reply message in the form definition. Also uses callbacks to create
 * record.
 *
 * Always try to create records for every message recieved.
 *
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
        errormsg = '',
        resp = {};

    if (form && def)
        form_data = smsparser.parse(def, doc);

    // provide callback for next part of record creation.
    resp.callback = {
        options: {
            host: host,
            port: port,
            method: "POST",
            headers: {'Content-Type': 'application/json; charset=utf-8'}
        }
    };

    resp.callback.options.path = baseURL + getCallbackPath(phone, def && form, form_data, def);
    resp.callback.data = getCallbackBody(phone, doc, form_data);
    resp.payload = getSMSResponse(resp.callback.data);

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
