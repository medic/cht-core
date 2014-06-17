var utils = require('kujua-utils'),
    _ = require('underscore')._;

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
exports.parse = function(def, doc) {
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

/**
 * @param {Object} def - forms form definition
 * @param {Object} doc - sms_message document
 * @returns {Array|[]} - An array of values from the raw sms message
 * @api public
 */
exports.parseArray = function(def, doc) {

    var obj = exports.parse(def, doc);

    if (!def || !def.fields) { return []; }

    // collect field keys into array
    var arr = [];
    for (var k in def.fields) {
        arr.push(obj[k]);
    };

    // The fields sent_timestamp and from are set by the gateway, so they are
    // not included in the raw sms message and added manually.
    arr.unshift(doc.from);
    arr.unshift(doc.sent_timestamp);

    return arr;
};
