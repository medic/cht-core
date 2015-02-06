var _ = require('underscore')._;

var zip = function (a, b) {
    var zipped = [];
    var len = Math.max(a.length, b.length);
    for (var i = 0; i < len; i++) {
        zipped[i] = [a[i], b[i]];
    }
    return zipped;
};

/**
 * @param {Object} def - forms form definition
 * @param {Object} doc - sms_message document
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails.
 *
 * @api public
 */
var parse = exports.parse = function(def, doc) {
    var parts = doc.message.split('#'),
        header = parts[0].split('!'),
        name = header[1],
        vals = parts.slice(1);

    vals.unshift(header[2]);

    if(!def || !def.fields) {
        return {};
    }

    // put field and values into paired array
    var pairs = zip(
        // include key value in paired array
        _.map(def.fields, function(val, key) {
            var field = def.fields[key];
            field._key = key;
            return field;
        }),
        vals
    );

    return pairs.reduce(function (obj, v) {
        var field = v[0],
            val = v[1];

        if (!field) {
            // ignore extra form data that has no matching field definition.
            obj._extra_fields = true;
        } else {
            obj[field._key] = typeof val === 'string' ? val.trim() : val;
        }

        return obj;
    }, {});
};
