/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore'),
    moment = require('moment'),
    logger = require('kujua-utils').logger,
    info = require('views/lib/appinfo'),
    smsparser = require('views/lib/smsparser'),
    libphonenumber = require('libphonenumber/utils'),
    validate = require('./validate'),
    utils = require('./utils'),
    req = {};


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
 * @param {Object} options from initial POST
 * @param {Object} form_data - parsed form data
 * @returns {Object} - data record
 * @api private
 */
var getDataRecord = function(options, form_data) {

    var form = options.form,
        def = utils.info.getForm(form);

    var record = {
        _id: req.uuid,
        type: 'data_record',
        from: libphonenumber.format(utils.info, options.from) || options.from,
        form: form,
        related_entities: {clinic: null},
        errors: [],
        tasks: [],
        reported_date: new Date().valueOf(),
        // keep POST data part of record
        sms_message: options
    };

    // try to parse timestamp from gateway
    var ts = parseSentTimestamp(options.sent_timestamp);
    if (ts) {
        record.reported_date = ts;
    }

    if (def) {
        if (def.facility_reference)
            record.refid = getRefID(form, form_data);

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

    if (!def || !def.public_form) {
        utils.addError(record, 'sys.facility_not_found');
    }

    if (typeof options.message === 'string' && !options.message.trim()) {
        utils.addError(record, 'sys.empty');
    }

    if (!def) {
        if (utils.info.forms_only_mode) {
            utils.addError(record, 'sys.form_not_found');
        } else {
            // if form is undefined we treat as a regular message
            record.form = undefined;
        }
    }

    return record;
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

var getDefaultResponse = function(doc) {
    var response = {
        payload: {
            success: true
        }
    };
    if (doc && doc._id) {
        response.payload.id = doc._id;
    }
    return response;
};

var getErrorResponse = function(msg, code) {
    return {
        code: code || 500,
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify({
            payload: {
                success: false,
                error: msg
            }
        })
    };
};

/*
 * Create new record.
 *
 * Support Medic Mobile message and JSON formatted documents in the POST body.
 * Support ODK Collect via Simple ODK server.  Adds standard fields to the
 * record like form, locale and reported_date.
 *
 * @returns {Array} Following CouchDB API, return final record object and
 *                  response with Ushahidi/SMSSync compatible JSON payload.
 */
exports.add = function(doc, request) {
    utils.info = info.getAppInfo.call(this);

    req = request;
    if (req.form && req.form.message) {
        return add_sms(doc, request);
    }
    return add_json(doc, request);
};

/*
 * Save parsed form submitted in JSON format when matching form definition can
 * be found.  Support ODK Collect via Simple ODK Server.  Add standard fields
 * to the record, like form, locale and reported_date.
 */
var add_json = exports.add_json = function(doc, request) {

    req = request;

    var def,
        data,
        record,
        options = {},
        form_data = {};

    try {
        data = JSON.parse(req.body);
    } catch(e) {
        logger.error(req.body);
        return [null, getErrorResponse('Error: request body not valid JSON.')];
    }

    // use locale if passed in via query param
    options.locale = req.query && req.query.locale;

    // ODK Collect conventions
    if (data.meta) {
        options.sent_timestamp = data.meta.submissionTime;
        options.form = smsparser.getFormCode(data.meta.formId);
    }

    def = utils.info.getForm(options.form);

    // require form definition
    if (!def) {
        return [null, getErrorResponse('Form not found: ' + options.form)];
    }

    // For now only save string and number fields, ignore the others.
    // Lowercase all property names.
    for (var k in data) {
        if (['string', 'number'].indexOf(typeof data[k]) >= 0) {
            form_data[k.toLowerCase()] = data[k];
        }
    }

    record = getDataRecord(options, form_data);

    return [
        record,
        JSON.stringify(getDefaultResponse(record))
    ];
}

var add_sms = exports.add_sms = function(doc, request) {

    req = request;
    var options = {
        type: 'sms_message',
        form: smsparser.getFormCode(req.form.message)
    };
    options = _.extend(req.form, options);

    // if locale was not passed in form data then check query string
    if (!options.locale) {
        options.locale = (req.query && req.query.locale) || utils.info.locale;
    }

    var def = utils.info.getForm(options.form),
        form_data = null,
        resp;

    if (options.form && def) {
        form_data = smsparser.parse(def, options);
    }

    var record = getDataRecord(options, form_data);

    return [
        record,
        JSON.stringify(getDefaultResponse(record))
    ];

};
