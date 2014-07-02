var utils = require('kujua-utils'),
    mp_parser = require('./mp_parser'),
    textforms_parser = require('./textforms_parser'),
    sms_utils = require('kujua-sms/utils');

/**
 * Decide if it's a form parsed by the muvuku parser.
 *
 * @param {String} msg sms message
 * @api private
 */
exports.isMuvukuFormat = function(msg) {
    if (typeof msg !== 'string') { return; }
    return msg.match(/^\s*\d+!.+!.+/) !== null;
};

/**
 * Uses the keys to create a deep key on the obj.
 * Assigns the val to the key in the obj.
 * If key already exists, only assign value.
 *
 * @param {Object} obj - object in which value is assigned to key
 * @param {Array} keys - keys in dot notation (e.g. ['some','thing','else'])
 * @param {String} val - value to be assigned to the generated key
 */
var createDeepKey = function(obj, keys, val) {
    if (keys.length === 0) {
        return;
    }

    var key = keys.shift();
    if (keys.length === 0) {
        obj[key] = val;
        return;
    }

    if(!obj[key]) {
        obj[key] = {};
    }
    createDeepKey(obj[key], keys, val);
};

var parseNum = function (raw) {
    if (raw === void 0) {
        return undefined;
    }
    if (!isFinite(raw) || raw === "") {
        return null;
    }
    return Number(raw);
};

var lower = function(str) {
    return str && str.toLowerCase ? str.toLowerCase() : str;
};

exports.parseField = function (field, raw) {
    switch (field.type) {
        case 'integer':
            // keep months integers, not their list value.
            if (field.validations && field.validations.is_numeric_month === true)
                return parseNum(raw);
            // store list value since it has more meaning.
            // TODO we don't have locale data inside this function so calling
            // translate does not resolve locale.
            if (field.list) {
                for (var i in field.list) {
                    var item = field.list[i];
                    if (String(item[0]) === String(raw)) {
                        return sms_utils.info.translate(item[1]);
                    }
                }
                utils.logger.warn('Option not available for '+JSON.stringify(raw)+' in list.');
            }
            return parseNum(raw);
        case 'string':
            if (raw === undefined) { return; }
            if (raw === "") { return null; }
            // store list value since it has more meaning.
            // TODO we don't have locale data inside this function so calling
            // translate does not resolve locale.
            if (field.list) {
                for (var i in field.list) {
                    var item = field.list[i];
                    if (item[0] === raw) {
                        return sms_utils.info.translate(item[1]);
                    }
                }
                utils.logger.warn('Option not available for '+raw+' in list.');
            }
            return sms_utils.info.translate(raw);
        case 'date':
            if (!raw) { return null; }
            // YYYY-MM-DD assume muvuku format for now
            // store in milliseconds since Epoch
            return new Date(raw).valueOf();
        case 'boolean':
            if (raw === undefined) { return; }
            var val = parseNum(raw);
            if (val === 1)
                return true;
            if (val === 0)
                return false;
            // if we can't parse a number then return null
            return null;
        case 'month':
            // keep months integers, not their list value.
            return parseNum(raw);
        default:
            utils.logger.warn('Unknown field type: ' + field.type);
            return raw;
    }
};

/**
 * @param {String} form - form definition id
 * @param {Object} def - jsonforms form definition
 * @param {Object} doc - sms_message document
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails. Currently supports textforms and muvuku formatted
 * messages.
 *
 * @api public
 */
exports.parse = function (def, doc) {

    var msg_data,
        form_data = {},
        addOmittedFields = false;

    if (!def || !doc || !doc.message || !def.fields) {
        return {};
    }

    utils.logger.debug('parsing message: '+ JSON.stringify(doc.message));

    if (exports.isMuvukuFormat(doc.message)) {
        // parse muvuku format
        msg_data = mp_parser.parse(def, doc);
        addOmittedFields = true;
    } else {

        var msg = doc.message || doc,
            code = def && def.meta && def.meta.code;

        /*
         * Remove the form code from the beginning of the message since it does
         * not belong to the TextForms format but is just a convention to
         * identify the message.
         */
        msg = msg.replace(new RegExp('^\\s*' + code + '\\s*','i'),'')

        if (textforms_parser.isCompact(def, msg)) {
            msg_data = textforms_parser.parseCompact(def, msg);
        } else {
            msg_data = textforms_parser.parse(msg);

            // replace tiny labels with field keys for textforms
            for (var j in def.fields) {
                var label = lower(sms_utils.info.getMessage(
                    def.fields[j].labels.tiny, doc.locale
                ));
                if (j !== label && msg_data[label]) {
                    msg_data[j] = msg_data[label];
                    msg_data[label] = undefined;
                }
            }
        }
    }

    // parse field types and resolve dot notation keys
    for (var k in def.fields) {
        if (msg_data[k] || addOmittedFields) {
            var value = exports.parseField(def.fields[k], msg_data[k]);
            createDeepKey(form_data, k.split('.'), value);
        }
    }


    // pass along some system generated fields
    if (msg_data._extra_fields === true) {
        form_data._extra_fields = true;
    }

    return form_data;
};

/**
 * @param {Object} def - jsonforms definition
 * @param {Object} doc - sms_message document
 * @returns {Array|[]} - An array of values from the raw sms message
 * @api public
 */
exports.parseArray = function (def, doc) {

    if(!def || !def.fields) { return []; }

    if (exports.isMuvukuFormat(doc.message)) {
        return mp_parser.parseArray(def, doc);
    } else {
        return textforms_parser.parseArray(doc);
    }

    return [];
};

/**
 * Determine form code through message headers, currently supporting muvuku and
 * textforms message formats.
 *
 * @param {String} msg - sms message
 * @returns {String} form code or undefined if we don't recognize the format
 * @api public
 */
exports.getFormCode = function(msg) {

    if (typeof msg !== 'string') { return; }

    // muvuku
    if (msg.split('!').length === 3) {
        return msg.split('!')[1].toUpperCase();
    }
    // textforms
    var match = msg.match(/^\s*([^\s!\-,:]+)[\s!\-,:]+.+/);
    if (match !== null && match.length === 2) {
        return match[1].toUpperCase();
    }

};

/**
 * Merge fields from the form definition with the form data received through
 * the SMS into a data record. Always use the key property on the form
 * definition to define the data record.
 *
 * @param {String} form         - form id
 * @param {Array}  key          - key of the field separated by '.'
 * @param {Object} data_record  - record into which the data is merged
 * @param {Object} form_data    - data from the SMS
 *                                to be merged into the data record
 * @api public
 */
exports.merge = function(form, key, data_record, form_data) {
    // support creating subobjects on the record if form defines key with dot
    // notation.
    if(key.length > 1) {
        var tmp = key.shift();
        if(form_data[tmp]) {
            if(!data_record[tmp]) {
                data_record[tmp] = {};
            }
            exports.merge(form, key, data_record[tmp], form_data[tmp]);
        }
    } else {
        data_record[key[0]] = form_data[key[0]];
    }
};

