var utils = require('kujua-utils'),
    moment = require('moment'),
    mp_parser = require('./mp_parser'),
    textforms_parser = require('./textforms_parser');

/**
 * Decide if it's a form parsed by the muvuku parser.
 *
 * @param {String} msg      - sms message
 *
 * @api private
 */
exports.isMuvukuFormat = function(msg) {
    if (typeof msg !== 'string') { return; }
    return msg.match(new RegExp('^\\s*\\d+![\\w]+!.+')) !== null;
};

/**
 * Splits key by '.' and creates a deep key on the obj.
 * Assigns the val to the key in the obj.
 * If key already exists, only assign value.
 *
 * @param {Object} obj - object in which value is assigned to key
 * @param {String} key - key in dot notation (e.g. some.thing.else)
 * @param {String} val - value to be assigned to the generated key
 */
var createDeepKey = function(obj, key, val) {
    if(key.length > 1) {
        var tmp = key.shift();
        if(!obj[tmp]) {
            obj[tmp] = {};
        }

        createDeepKey(obj[tmp], key, val);
    } else {
        obj[key[0]] = val;
    }
};

var parseNum = function (raw) {
    if (raw === void 0) {
        return undefined;
    } else if (!isFinite(raw) || raw === "") {
        return null;
    } else {
        return Number(raw);
    }
};

exports.parseField = function (field, raw) {
    switch (field.type) {
        case 'integer':
            // store months as integers
            if (field.validate && field.validate.is_numeric_month)
                return parseNum(raw);
            // store list value since it has more meaning.
            // TODO we don't have locale data inside this function so calling
            // localizedString does not resole locale.
            if (field.list) {
                for (var i in field.list) {
                    var item = field.list[i];
                    if (item[0] == raw) { // loose typing
                        return utils.localizedString(item[1]);
                    }
                }
                utils.logger.error('Option not available for '+raw+' in list.');
                utils.logger.error(field.list);
            }
            return parseNum(raw);
        case 'string':
            if (raw === undefined) { return; }
            if (raw === "") { return null; }
            // store list value since it has more meaning.
            // TODO we don't have locale data inside this function so calling
            // localizedString does not resole locale.
            if (field.list) {
                for (var i in field.list) {
                    var item = field.list[i];
                    if (item[0] === raw) {
                        return utils.localizedString(item[1]);
                    }
                }
                utils.logger.error('Option not available for '+raw+' in list.');
                utils.logger.error(field.list);
            }
            return utils.localizedString(raw);
        case 'date':
            if (!raw) { return null; }
            // YYYY-MM-DD assume muvuku format for now
            // store in milliseconds since Epoch
            return moment(raw, 'YYYY-MM-DD').valueOf();
        case 'boolean':
            return parseNum(raw) === 1;
        default:
            utils.logger.error('Unknown field type: ' + field.type);
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

    var msg_data = {},
        form_data = {};

    if (!def || !doc || !doc.message || !def.fields)
        return {};

    if (exports.isMuvukuFormat(doc.message)) {
        // parse muvuku format
        msg_data = mp_parser.parse(def, doc);

        // parse field types and resolve dot notation keys
        for (var k in def.fields) {
            msg_data[k] = exports.parseField(def.fields[k], msg_data[k]);
            createDeepKey(form_data, k.split('.'), msg_data[k]);
        }

    } else {
        // parse textforms format
        msg_data = textforms_parser.parse(doc);

        // replace tiny labels with field keys for textforms
        for (var k in msg_data) {
            for (var j in def.fields) {
                var field = def.fields[j],
                    tiny = utils.localizedString(field.labels.tiny, doc.locale);
                if (tiny.toLowerCase() === k) {
                    form_data[j] = msg_data[k];
                    break;
                }
            }
        }

        // parse field types and resolve dot notation keys
        for (var k in def.fields) {
            form_data[k] = exports.parseField(def.fields[k], form_data[k]);
            createDeepKey(form_data, k.split('.'), form_data[k]);
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
exports.getForm = function(msg) {

    if (typeof msg !== 'string') { return; }

    // muvuku
    if (msg.split('!').length === 3) {
        return msg.split('!')[1].toUpperCase();
    }
    // textforms
    var match = msg.match(new RegExp('^\\s*([\\w]+)\\s+.+'));
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

