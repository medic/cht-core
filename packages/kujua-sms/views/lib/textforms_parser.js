/**
 * This is a modified version of the TextForms parser.
 *
 * It returns all keys in lower case and only returns
 * the value, not the type. The changes were made to
 * make it compatible with the existing smsparser.
 *
 * @class TextForms:
 */

var TextForms = function () {

    this.clear();

    this._re = {
        decimal: new RegExp('\\.'),
        boundary: new RegExp('\\s*#\\s*'),
        // values with leading 0 are not numeric
        numeric: new RegExp('[1-9]+(?:\\.(?:\\d+)?)?')
    };

    this._re.numeric_only = new RegExp(
        '^\\s*' + this.embed_re(this._re.numeric) + '\\s*$'
    );

    this._re.field = new RegExp(
        '\\s*([A-Za-z_\\.\\*\\-.]+)(' +
            this.embed_re(this._re.numeric) + ')?(?:\\s+(.+))?'
    );
};

TextForms.prototype = {

    /**
     * @name embed_re
     * Given a javascript `RegExp` object in `_regex`, return a string
     * version of the regular expression, suitable for embedding within
     * another larger regular expression via `new RegExp(...)`.
     */
    embed_re: function (_regex) {

        return _regex.toString().replace(new RegExp('^\\/'), '')
                .replace(new RegExp('\\/$'), '');
    },

    /**
     * @name trim:
     * Return a trimmed version of the string `_s` -- that is, a version
     * with whitespace removed from the beginning and end of the string.
     */
    trim: function (_s) {

        return _s.replace(new RegExp('^\\s+'), '').replace(new RegExp('\\s+$'), '');
    },

    /**
     * @name type_of:
     *  Determines the TextForms type for the string `_s`.
     */
    type_of: function (_s) {

        if (_s.match(this._re.numeric_only)) {
            if (_s.match(this._re.decimal)) {
                return 'numeric';
            } else {
                return 'integer';
            }
        } else {
            return 'string';
        }
    },

    /**
     * @name format_as:
     *  Given a string `_value` with type `_type`, this function
     *  "casts" `_value` to the appropriate javascript type.
     */
    format_as: function (_type, _value) {

        switch (_type) {
            case 'integer':
                return parseInt(_value, 10);
            case 'numeric':
                return parseFloat(_value);
            default:
                break;
        }

        return _value;
    },

    /**
     * @name set_result:
     *  Insert a result in to the TextForms result buffer.
     *  If a result for `_key` already exists, the value is
     *  promoted to an array and multiple values are stored
     *  in the sequence that they appeared.
     */
    set_result: function (_key, _value) {

        var key = _key.toLowerCase();

        if (this._result[key] === undefined) {

            /* Single pair result */
            this._result[key] = _value;

        } else if (this._result[key] instanceof Array) {

            /* Second-or-later pair result */
            this._result[key].push(_value);

        } else {

            /* First pair result */
            this._result[key] = [ this._result[key], _value ];
        }
    },

    /**
     * @name parse:
     * Given a TextForms-encoded input string in `_input`, decode
     * the string and place the results in the result buffer of
     * the TextForms instance `this`.
     */
    parse: function (_input) {

        /* Find all message components:
            Each message component is a distinct TextForms "field". */

        var fields = _input.split(this._re.boundary);

        for (var i = 0, len = fields.length; i < len; ++i) {

            /* Process message component:
                Each component has a key (which is the field's name), plus
                either: (i) a value written with an explicit whitespace
                separator (stored in `other`) or (ii) a value written with
                an implicit separator (in `numeric`, and never a string). */

            var m = fields[i].match(this._re.field);

            /* Empty component:
                Skip a completely-empty component (i.e. a non-match) */

            if (!m) {
                continue;
            }

            /* Capture subgroups:
                These refer to the `this._re.field` regular expression. */

            var key = m[1], numeric = m[2], other = m[3];

            /* Whitespace-only value of `other`?:
                Interpret as non-match, preventing pair formation (below). */

            if (other !== undefined && this.trim(other) === '') {
                other = undefined;
            }

            /* If `numeric` *and* `other` both match text:
                This is either a field name that ends in a digit, a field
                name with multiple values specified, or a single value in a
                sequence (with an offset and value). This condition needs
                to be disambiguated by comparing against a schema (later). */

            if (other !== undefined && numeric !== undefined) {

                var numeric_type = this.type_of(numeric);
                var other_type = this.type_of(other);

                var result = {
                    type: 'pair',
                    values: [
                        this.format_as(numeric_type, numeric),
                        this.format_as(other_type, other)
                    ],
                };

                this.set_result(key, result);
                continue;
            }

            /* Number written with explicit separator?
                If there was an explicit space between the field's key
                and a numeric value, "promote" the value to numeric. */

            if (other && this.type_of(other) !== 'string') {
                numeric = other;
                other = undefined;
            }

            /* Data type detection:
                Given numeric data, differentiate between an integer
                and a decimal value. Otherwise, just store the string. */

            if (numeric !== undefined) {

                var type = this.type_of(numeric);

                /* Differentiate integer from numeric:
                    The type here will never be string, per the regex. */

                if (type === 'integer') {
                    this.set_result(key, this.format_as(type, numeric));
                } else {
                    this.set_result(key, this.format_as('numeric', numeric));
                }

            } else {

                /* Store string as-is */
                this.set_result(key, other);
            }
        }

        return this;
    },

    /**
     * @name clear:
     *  Clear the TextForms result buffer, discarding any previous
     *  results stored by the `parse` method.
     */
    clear: function () {

        this._result = {};
    },

    /**
     * @name result:
     *  Return the TextForms result buffer, containing the output of
     *  one or more `parse` operations.
     */
    result: function () {

        return this._result;
    }
};

/**
 * Remove the form code from the beginning of the message
 * since it does not belong to the TextForms format
 * but is just a convention to identify the message.
 *
 * @param {Object|String} doc - sms_message document or sms message string
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails.
 *
 * @api public
 */
exports.parse = function(doc) {
    var t = new TextForms(),
        msg = doc.message ? doc.message : doc;

    if (!msg)
        return {};

    var match = msg.match(new RegExp('^\\s*\\w+\\s+(.*)'));

    if (match === null)
        return {};

    return t.parse(match[1]).result();
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
