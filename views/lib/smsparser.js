
exports.parseNum = function (raw) {
    if (!isFinite(raw)) {
        return null;
    }
    return Number(raw);
};

exports.parseField = function (type, raw, prev) {
    switch (type.type) {
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
        if (val in type.choices)
            return type.choices[val];
        log('Option not available for '+val+' in choices.');
        return raw;
    default:
        throw new Error('Unknown field type: ' + type.type);
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

/*
 * Return parsed object.
 */
exports.parse = function (def, doc) {
    var parts = doc.message.split('#'),
        header = parts[0].split('!'),
        name = header[1],
        vals = parts.slice(1);

    vals.unshift(header[2]);

    var pairs = zip(def, vals);

    return pairs.reduce(function (obj, v) {
        var d = v[0];
        obj[d.key] = exports.parseField(d, v[1], obj[d.key]);
        return obj;
    }, {});
};

exports.parseArray = function (def, doc) {
    var obj = exports.parse(def, doc);
    var keys = [];
    for (var i = 0; i < def.length; i++) {
        if (keys.indexOf(def[i].key) === -1) {
            keys.push(def[i].key);
        }
    }
    var arr = [];
    for (var k = 0; k < keys.length; k++) {
        arr.push(obj[keys[k]]);
    }
    // The fields sent_timestamp and from are set by the gateway, so they are
    // not included in the message.
    arr.unshift(doc.from);
    arr.unshift(doc.sent_timestamp);
    return arr;
};
