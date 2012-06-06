var utils = require('kujua-utils'),
    _ = require('underscore')._;

exports.parseNum = function (raw) {
    if (raw === void 0) {
        return undefined;
    } else if (!isFinite(raw) || raw === "") {
        return null;
    } else {
        return Number(raw);
    }
};

exports.parseField = function (field, raw, prev) {
    switch (field.type) {
        case 'number':
        case 'integer':
            return exports.parseNum(raw);
        case 'string':
            if (raw === undefined) { return; }
            return raw === "" ? null : utils.localizedString(raw);
        case 'year':
            return raw;
        case 'month':
            return raw;
        case 'date':
            var val = prev || new Date(0);
            val.setDate(raw);
            return val;
        case 'select':
            var val = exports.parseNum(raw);
            var match = _.find(field.list, function(l) {
                return l[0] === val;
            });
            if (match && match[1]) { return utils.localizedString(match[1]); }
            utils.logger.error('Option not available for '+val+' in select list.');
            utils.logger.error(field.list);
            return val;
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
 * Splits key by '.' and creates a deep key on the obj.
 * Assigns the val to the key in the obj.
 * If key already exists, only assign value.
 *
 * @param {Object} obj - object in which value is assigned to key
 * @param {String} key - key in dot notation (e.g. some.thing.else)
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
 * @param {Object} def - smsforms form definition
 * @param {Object} doc - sms_message document
 * @param {Number} format - if 1 then include labels in value
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails.
 *
 * @api public
 */
exports.parse = function(def, doc, format) {
    var parts = doc.message.split('#'),
        header = parts[0].split('!'),
        name = header[1],
        vals = parts.slice(1),
        format = format ? format : 0;

    vals.unshift(header[2]);

    if(!def || !def.fields) {
        return {};
    }

    var pairs = zip(def.fields, vals);

    return pairs.reduce(function (obj, v) {
        var field = v[0],
            val = v[1],
            result;

        // ignore extra form data that has no matching field definition.
        if (!field) {
            obj.extra_fields = true;
            return obj;
        }

        if (format === 1) {
            // include label in array
            result = [
                exports.parseField(field, val, obj[field.key]), field.label];
        } else {
            result = exports.parseField(field, val, obj[field.key]);
        }

        createDeepKey(obj, field.key.split('.'), result);
        return obj;
    }, {});
};

/**
 * @param {Object} def - smsforms definition
 * @param {Object} doc - sms_message document
 * @returns {Array|[]} - An array of values from the raw sms message
 * @api public
 */
exports.parseArray = function(def, doc) {
    var obj = exports.parse(def, doc);

    var keys = [];

    if(!def || !def.fields) {
        return [];
    }

    for (var i = 0; i < def.fields.length; i++) {
        if (keys.indexOf(def.fields[i].key) === -1) {
            keys.push(def.fields[i].key);
        }
    }

    var arr = [];
    for (var k = 0; k < keys.length; k++) {
        var key = keys[k].split('.');
        var result = obj;

        while(key.length > 0) {
            result = result[key.shift()];
        }

        arr.push(result);
    }

    // The fields sent_timestamp and from are set by the gateway, so they are
    // not included in the raw sms message and added manually.
    arr.unshift(doc.from);
    arr.unshift(doc.sent_timestamp);
    
    return arr;
};
