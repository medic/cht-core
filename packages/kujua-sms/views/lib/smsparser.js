var utils = require('kujua-utils'),
    mp_parser = require('./mp_parser'),
    textforms_parser = require('./textforms_parser');

/**
 * Decide if it's a form parsed by the testforms parser.
 *
 * @param {String} msg      - sms message
 *
 * @api private
 */
exports.isTextformsFormat = function(msg) {
    return msg.match(new RegExp('^\\s*[A-Z]{4}\\s+\\w+.*#')) !== null;
};

/**
 * Decide if it's a form parsed by the muvuku parser.
 *
 * @param {String} msg      - sms message
 *
 * @api private
 */
exports.isMuvukuFormat = function(msg) {
    return msg.match(new RegExp('^\\s*\\d+![A-Z]{4}!')) !== null;
};

/**
 * Return format string for use on sms_message record and various decisions.
 *
 * @param {String} msg      - sms message
 *
 * @api public
 * */
exports.getSMSFormat = function(msg) {

    if (!msg)
        return 'unstructured';

    if (exports.isTextformsFormat(msg))
        return 'textforms';

    if (exports.isMuvukuFormat(msg))
        return 'muvuku';

    return 'unstructured';
};

/**
 * @param {String} form - form definition id
 * @param {Object} def - jsonforms form definition
 * @param {Object} doc - sms_message document
 * @param {Number} format - if 1 then include labels in value
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails.
 *
 * @api public
 */
exports.parse = function (form, def, doc, format) {

    if (!def) { return {}; }

    if (exports.isTextformsFormat(doc.message)) {
        // parse message data and return lowercase key/value pairs
        var msg_data = textforms_parser.parse(doc),
            form_data = {};

        // replace tiny labels with field keys
        for (var k in msg_data) {
            for (var k in def.fields) {
                var field = def.fields[k],
                    tiny = utils.localizedString(field.labels.tiny, doc.locale);
                if (tiny.toLowerCase() === k) {
                    form_data[k] = msg_data[k];
                    break;
                }
            }
        }

        return form_data;
    }

    return mp_parser.parse(def, doc, format);
};

/**
 * @param {String} form - form definition id
 * @param {Object} def - jsonforms definition
 * @param {Object} doc - sms_message document
 * @returns {Array|[]} - An array of values from the raw sms message
 * @api public
 */
exports.parseArray = function (form, def, doc) {
    if (exports.isTextformsFormat(doc.message)) {
        return textforms_parser.parseArray(doc);
    } else {
        return mp_parser.parseArray(def, doc);
    }
};

/**
 * Determine form through message headers, currently supporting muvuku and
 * textforms message formats.
 *
 * @param {String} message
 * @returns {String} form or undefined if we don't recognize the format
 * @api public
 */
exports.getForm = function(message) {
    if(message.split('!').length === 3) {
        return message.split('!')[1];
    }
    var txtforms = message.match(/^\s*(\w+)\s+/);
    if (txtforms !== null && txtforms.length === 2) {
        return txtforms[1];
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
 * @param {String} format       - message type format string, derived from
 *                                getSMSFormat
 *
 * @api public
 */
exports.merge = function(form, key, data_record, form_data, format) {
    // support creating subobjects on the record if form defines key with dot
    // notation.
    if(key.length > 1) {
        var tmp = key.shift();
        if(form_data[tmp]) {
            if(!data_record[tmp]) {
                data_record[tmp] = {};
            }
            exports.merge(form, key, data_record[tmp], form_data[tmp], format);
        }
    } else {
        if (format === 'textforms') {
            data_record[key[0]] = form_data[key[0]];
        } else if (format === 'muvuku') {
            data_record[key[0]] = form_data[key[0]][0];
        }
    }
};

