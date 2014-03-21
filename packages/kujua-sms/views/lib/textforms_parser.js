var _ = require('underscore'),
    embed_re = function (_regex) {
        return _regex.toString()
                .replace(new RegExp('^\\/'), '')
                .replace(new RegExp('\\/$'), '');
    },
    _re_decimal = new RegExp('\\.'),
    _re_boundary = new RegExp('\\s*#\\s*'),
    _re_numeric = new RegExp('[1-9][0-9]*(?:\\.(?:\\d+)?)?'),
    _re_date = new RegExp('[\\d]{4}[-/][\\d]{1,2}[-/][\\d]{1,2}'),
    _re_numeric_only = new RegExp('^\\s*' + embed_re(_re_numeric) + '\\s*$'),
    _re_field = new RegExp(
        '\\s*([A-Za-z_\\.\\*.]+)'
        + '[\\s-!]*(' + embed_re(_re_date) + ')?'
        + '[\\s-!]*(' + embed_re(_re_numeric) + ')?'
        + '[\\s-!]*(.+?)?\\s*$'
    );

/**
 * This is a modified version of the TextForms parser.
 *
 * It returns all keys in lower case and only returns
 * the value, not the type. The changes were made to
 * make it compatible with the existing smsparser.
 *
 * @class TextForms:
 */


var lower = function(str) {
    return str && str.toLowerCase ? str.toLowerCase() : str;
};

var startsWith = function(lhs, rhs) {
    return lhs && rhs && lhs.substring(0, rhs.length) === rhs;
};

/**
 * @name trim:
 * Return a trimmed version of the string `_s` -- that is, a version
 * with whitespace removed from the beginning and end of the string.
 */
var trim = function (_s) {
    return _s.replace(new RegExp('^\\s+'), '').replace(new RegExp('\\s+$'), '');
};

/**
 * @name type_of:
 *  Determines the TextForms type for the string `_s`.
 */
var type_of = function (_s) {
    if (_s.match(_re_numeric_only)) {
        if (_s.match(_re_decimal)) {
            return 'numeric';
        } else {
            return 'integer';
        }
    } else {
        return 'string';
    }
};

/**
 * @name format_as:
 *  Given a string `_value` with type `_type`, this function
 *  "casts" `_value` to the appropriate javascript type.
 */
var format_as = function (_type, _value) {
    switch (_type) {
        case 'integer':
            return parseInt(_value, 10);
        case 'numeric':
            return parseFloat(_value);
        case 'date':
            return new Date(_value).valueOf();
        default:
            return _value;
    }
};

/**
 * @name set_result:
 *  Insert a result in to the TextForms result buffer.
 *  If a result for `_key` already exists, the value is
 *  promoted to an array and multiple values are stored
 *  in the sequence that they appeared.
 */
var set_result = function (_result, _key, _value) {
    var key = _key.toLowerCase();

    if (_result[key] === undefined) {
        /* Single pair result */
        if (_value && _value.values instanceof Array) {
            _result[key] = _value.values.join('');
        } else {
            _result[key] = _value;
        }
    } else if (_result[key] instanceof Array) {
        /* Second-or-later pair result */
        _result[key].push(_value);
    } else {
        /* First pair result */
        _result[key] = [ _result[key], _value ];
    }
};


/**
 * @param {Object|String} msg - sms_message document or sms message string
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails.
 *
 * @api public
 */
exports.parse = function(msg) {
    if (!msg) return {};
    msg = msg.message || msg;
    var fields = msg.split(_re_boundary);

    var results = {};
    for (var i = 0, len = fields.length; i < len; ++i) {

        /* Process message component:
            Each component has a key (which is the field's name), plus
            either: (i) a value written with an explicit whitespace
            separator (stored in `other`) or (ii) a value written with
            an implicit separator (in `numeric`, and never a string). */

        var m = fields[i].match(_re_field);

        /* Empty component:
            Skip a completely-empty component (i.e. a non-match) */

        if (!m) {
            continue;
        }

        /* Capture subgroups:
            These refer to the `_re_field` regular expression. */

        var key = m[1],
            date = m[2],
            numeric = m[3],
            other = m[4];

        /* Whitespace-only value of `other`?:
            Interpret as non-match, preventing pair formation (below). */

        if (other !== undefined && trim(other) === '') {
            other = undefined;
        }

        /* If `numeric` *and* `other` both match text:
            This is either a field name that ends in a digit, a field
            name with multiple values specified, or a single value in a
            sequence (with an offset and value). This condition needs
            to be disambiguated by comparing against a schema (later). */

        if (other !== undefined && numeric !== undefined) {

            var numeric_type = type_of(numeric);
            var other_type = type_of(other);

            var result = {
                type: 'pair',
                values: [
                    format_as(numeric_type, numeric),
                    format_as(other_type, other)
                ],
            };

            set_result(results, key, result);
            continue;
        }

        /* Number written with explicit separator?
            If there was an explicit space between the field's key
            and a numeric value, "promote" the value to numeric. */

        if (other && type_of(other) !== 'string') {
            numeric = other;
            other = undefined;
        }

        /* Data type detection:
            Given numeric data, differentiate between an integer
            and a decimal value. Otherwise, just store the string. */

        if (numeric !== undefined) {

            var type = type_of(numeric);

            /* Differentiate integer from numeric:
                The type here will never be string, per the regex. */

            if (type === 'integer') {
                set_result(results, key, format_as(type, numeric));
            } else {
                set_result(results, key, format_as('numeric', numeric));
            }

        } else if (date !== undefined) {
            set_result(results, key, format_as('date', date));
        } else {

            /* Store string as-is */
            set_result(results, key, other);
        }
    }

    return results;
};

exports.parseCompact = function(def, msg) {
    if (!msg) {
        return {};
    }
    msg = msg.message || msg;
    var values = msg.match(/\w+|"[^"]+"/g);
    var keys = _.keys(def.fields);

    var results = {};

    // TODO parse values (int, date, etc)
    for (var i = 0; i < values.length; i++) {
        value = values[i].replace(/"/g,"");
        key = keys[i];
        set_result(results, key, value);
    }

    return results;
};

exports.isCompact = function(def, msg) {
    if (!msg) {
        return false;
    }
    msg = msg.message || msg;
    var fields = msg.split(_re_boundary);
    if (fields.length !== 1) {
        return false;
    }
    var labels = _.flatten(_.map(_.values(def.fields), function(field) {
        return [field.labels.short, field.labels.tiny];
    }));
    return !_.some(labels, function(label) {
        return startsWith(lower(fields[0]), lower(label));
    });
};

/**
 * @param {Object} doc - sms_message document
 * @returns {Array|[]} - An array of values from the raw sms message
 * @api public
 */
exports.parseArray = function(doc) {

    var obj = exports.parse(doc);

    var arr = [];
    for (key in obj) {
        arr.push(obj[key]);
    }

    // The fields sent_timestamp and from are set by the gateway, so they are
    // not included in the raw sms message and added manually.
    arr.unshift(doc.from);
    arr.unshift(doc.sent_timestamp);

    return arr;
};
