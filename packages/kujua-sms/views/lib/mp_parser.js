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
 * Splits key by '.' and creates a deep key on the obj.
 * Assigns the val to the key in the obj.
 * If key already exists, only assign value.
 *
 * @param {Object} obj - object in which value is assigned to key
 * @param {Array} key  - key in dot notation (e.g. some.thing.else)
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

/**
 * @param {Object} def - jsonforms form definition
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
            val = v[1],
            result;

        // ignore extra form data that has no matching field definition.
        if (!field) {
            obj._extra_fields = true;
            return obj;
        }

        /* deprecating format param
        if (format === 1) {
            // include label in array
            result = [
                exports.parseField(field, val, obj[field._key]),
                utils.localizedString(field.labels.short) // TODO fix ugly
            ];
        } else {
            result = exports.parseField(field, val, obj[field._key]);
        }

        createDeepKey(obj, field._key.split('.'), val);
        */
        obj[field._key] = val;
        return obj;
    }, {});
};

/**
 * @param {Object} def - jsonforms form definition
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
