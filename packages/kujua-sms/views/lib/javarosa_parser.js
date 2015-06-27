var _ = require('underscore')._,
    sms_utils = require('kujua-sms/utils');

/*
 * Take raw message and return array of labels and values.
 */
exports._getParts = function(msg, method) {
    var data = msg.split('!').slice(2).join('!'),
        parts = [];
    if (!method) {
      // Tries to split on hash '#' unless it is escaped.  Use uncommon string
      // as placeholder.
      parts = data.replace(/([^\\])#/g, '$1\u000B').split('\u000B');
    } else if (method === 1) {
      parts = data.match(/([^\\\][^#]|\\#)+/g);
    } else if (method === 2) {
      // Since javascript does not support look behind regex, glue parts
      // back together that were escaped.
      for (var i = 0, j = data.split('#').length - 1; i < j; i++) {
          var p = data[i];
          if (p.charAt(p.length - 1) == '\\') {
              // glue with next and skip next (increment i)
              p += '#' + data[++i];
          }
          parts.push(p);
      }
    }
    return _.map(parts || [], function(p) {
        // remove slashes from escaped delimiter
        return p.replace(/\\#/g, '#');
    });
};

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
    var parts = exports._getParts(doc.message),
        labels = [],
        vals = [],
        obj = {};

    if(!def || !def.fields || !parts) {
        return {};
    }

    // collect tiny labels
    for (var i = 0, len = parts.length; i < len; ++i) {
        if (i % 2 === 0) {
            // trim whitespace here so label match below works. allows
            // whitespace in label submission.
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
            if (labels[i].match(new RegExp('^' + label + '$', 'i'))) {
                obj[key] = vals[i];
            }
        }
    });

    return obj;
};
