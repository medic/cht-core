
exports.parseNum = function (raw) {
    if (!isFinite(raw)) {
        return null;
    }
    return Number(raw);
};

exports.parseField = function (field, raw, prev) {
    switch (field.type) {
        case 'number':
            return exports.parseNum(raw);
        case 'string':
            return raw;
        case 'year':
            return raw;
        case 'month':
            return raw;
        case 'date':
            var val = prev || new Date(0);
            val.setDate(raw);
            return val;
        case 'choice':
            var val = exports.parseNum(raw);
            if (val in field.choices)
                return field.choices[val];
            if (typeof log !== 'undefined')
                log('Option not available for '+val+' in choices.');
            if (typeof console !== 'undefined')
                console.log('Option not available for '+val+' in choices.');
            return raw;
        default:
            throw new Error('Unknown field type: ' + field.type);
    }
};

var zip = function (a, b) {
    var zipped = [];
    var len = Math.max(a.length, b.length);
    for (var i = 0; i < len; i++) {
        zipped[i] = [a[i], b[i]];
    }
    return zipped;
};

/**
 * @param {Object} def - smsforms form definition
 * @param {Object} doc - sms_message document
 * @param {Number} format - if 1 then include labels in value
 * @returns {Object|{}} - An parsed object from the raw sms message
 * @api public
 */
exports.parse = function (def, doc, format) {
    var parts = doc.message.split('#'),
        header = parts[0].split('!'),
        name = header[1],
        vals = parts.slice(1),
        format = format ? format : 0;

    vals.unshift(header[2]);

    if (!def || !def.fields) return {};

    var pairs = zip(def.fields, vals);

    return pairs.reduce(function (obj, v) {
        var field = v[0],
            val = v[1];
        if (format === 1) {
            // include label in array
            obj[field.key] = [
                exports.parseField(field, val, obj[field.key]), field.label];
        } else {
            obj[field.key] = exports.parseField(field, val, obj[field.key]);
        }
        return obj;
    }, {});
};

/**
 * @param {Object} def - smsforms definition
 * @param {Object} doc - sms_message document
 * @returns {Array|[]} - An array of values from the raw sms message
 * @api public
 */
exports.parseArray = function (def, doc) {
    var obj = exports.parse(def, doc);
    var keys = [];
    for (var i = 0; i < def.fields.length; i++) {
        if (keys.indexOf(def.fields[i].key) === -1) {
            keys.push(def.fields[i].key);
        }
    }
    var arr = [];
    for (var k = 0; k < keys.length; k++) {
        arr.push(obj[keys[k]]);
    }
    // The fields sent_timestamp and from are set by the gateway, so they are
    // not included in the raw sms message and added manually.
    arr.unshift(doc.from);
    arr.unshift(doc.sent_timestamp);
    return arr;
};
