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
        case 'integer':
            // store months as integers
            if (field.validate && field.validate.is_numeric_month)
                return exports.parseNum(raw);
            // resolve integer to list value since it has more meaning.
            // TODO we don't have locale data inside this function so calling
            // localizedString does nothing.
            if (field.list) {
                for (var i in field.list) {
                    var item = field.list[i];
                    if (item[0] == raw) { // loose typing
                        return utils.localizedString(item[1]);
                    }
                }
                utils.logger.error('Option not available for '+raw+' in list.');
                utils.logger.error(field.list);
            }
            return exports.parseNum(raw);
        case 'string':
            if (raw === undefined) { return; }
            if (raw === "") { return null; }
            // resolve string to list value since it has more meaning.
            // TODO we don't have locale data inside this function so calling
            // localizedString does nothing.
            if (field.list) {
                for (var i in field.list) {
                    var item = field.list[i];
                    if (item[0] === raw) {
                        return utils.localizedString(item[1]);
                    }
                }
                utils.logger.error('Option not available for '+raw+' in list.');
                utils.logger.error(field.list);
            }
            return utils.localizedString(raw);
        case 'date':
            var val = prev || new Date();
            val.setDate(raw);
            return val;
        case 'boolean':
            return raw;
        default:
            utils.logger.error('Unknown field type: ' + field.type);
            return raw;
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
 * @param {Object} def - jsonforms form definition
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
            obj.extra_fields = true;
            return obj;
        }

        if (format === 1) {
            // include label in array
            result = [
                exports.parseField(field, val, obj[field._key]),
                utils.localizedString(field.labels.short) // TODO fix ugly
            ];
        } else {
            result = exports.parseField(field, val, obj[field._key]);
        }

        createDeepKey(obj, field._key.split('.'), result);
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

    if(!def || !def.fields) {
        return [];
    }

    // collect field keys into array
    var keys = [];
    for (var k in def.fields) {
        if (keys.indexOf(k) === -1) {
            keys.push(k);
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
