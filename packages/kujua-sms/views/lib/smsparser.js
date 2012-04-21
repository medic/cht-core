var mp_parser = require('./mp_parser'),
    textforms_parser = require('./textforms_parser');

/**
 * @param {String} form - form definition id
 * @param {Object} def - smsforms form definition
 * @param {Object} doc - sms_message document
 * @param {Number} format - if 1 then include labels in value
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails.
 *
 * @api public
 */
exports.parse = function (form, def, doc, format) {
    if(exports.isTextForms(form)) {
        return textforms_parser.parse(doc);
    } else {
        return mp_parser.parse(def, doc, format);        
    }
};

/**
 * @param {String} form - form definition id
 * @param {Object} def - smsforms definition
 * @param {Object} doc - sms_message document
 * @returns {Array|[]} - An array of values from the raw sms message
 * @api public
 */
exports.parseArray = function (form, def, doc) {
    if(exports.isTextForms(form)) {
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
    if (message.match(new RegExp('\s*SUR'))) {
        return 'CNPW';
    }
};

/**
 * Merge fields from the smsforms definition with
 * the form data received through the SMS into
 * a data record.
 *
 * @param {String} form         - form id
 * @param {Array}  key          - key of the field separated by '.'
 * @param {Object} data_record  - record into which the data is merged
 * @param {Object} form_data    - data from the SMS
 *                                to be merged into the data record
 * @api private
 */
exports.merge = function(form, key, data_record, form_data) {
    if(key.length > 1) {
        var tmp = key.shift();
        if(form_data[tmp]) {
            if(!data_record[tmp]) {
                data_record[tmp] = {};
            }
            exports.merge(form, key, data_record[tmp], form_data[tmp]);
        }
    } else {
        if(exports.isTextForms(form)) {
            data_record[key[0]] = form_data[key[0]];
        } else {
            data_record[key[0]] = form_data[key[0]][0];
        }
    }
};

/**
 * Decide if it's a form parsed by the testforms
 * parser.
 *
 * @param {String} form         - form id
 *
 * @api private
 */
exports.isTextForms = function(form) {
    return form === "CNPW";
};
