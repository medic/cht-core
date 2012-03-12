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
    if(form === "CNPW") {
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
    if(form === "CNPW") {
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
