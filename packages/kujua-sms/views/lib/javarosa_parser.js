var _ = require('underscore')._,
    sms_utils = require('kujua-sms/utils');

/**
 * Custom Medic Mobile Javarosa message parser.
 *
 * @param {Object} def - forms form definition
 * @param {Object} doc - sms_message document
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails.
 *
 * @api public
 */
exports.parse = function(def, doc) {
    var data = doc.message.split('!')[2],
        labels = [],
        vals = [],
        obj = {};

    // Split on hash '#' unless it is escaped.  Use uncommon string as
    // placeholder.
    var parts = data.replace(/([^\\])#/g, '$1\u000B').split('\u000B');

    if(!def || !def.fields) {
        return {};
    }

    // collect tiny labels
    for (var i = 0, len = parts.length; i < len; ++i) {
        if (i % 2 === 0) {
            // trim whitespace
            labels.push(parts[i].trim());
        } else {
            vals.push(parts[i]);
        }
    }


    /*
     * Loop through form definition fields and build object when tiny label
     * matches. Also in field values remove escape characters on escaped
     * delimiters.
     */
    _.each(def.fields, function(field, key) {
        // ignore fields without tiny labels
        if (!field.labels || !field.labels.tiny) {
            return;
        }
        var label = sms_utils.info.getMessage(field.labels.tiny);
        for (var i = 0; i < labels.length; i++) {
            // allowing whitespace in label submission
            if (labels[i].match(new RegExp('^' + label + '$', 'i'))) {
                obj[key] = vals[i].replace(/\\#/g, '#');
            }
        };
    });

    return obj;
};
