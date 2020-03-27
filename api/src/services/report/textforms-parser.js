/**
 * This is a modified version of the TextForms parser.
 *
 * It returns all keys in lower case and only returns
 * the value, not the type. The changes were made to
 * make it compatible with the existing smsparser.
 *
 * @module textforms-parser
 */
const _ = require('lodash');
const config = require('../../config');
const embedRe = function(re) {
  return re.toString()
    .replace(/^\//, '')
    .replace(/\/$/, '');
};
const reDecimal = /\./;
const reBoundary = /\s*#\s*/;
const reDate = /[\d]{4}[-/][\d]{1,2}[-/][\d]{1,2}/;
const reNumeric = /[1-9][0-9]*(?:\.(?:\d+)?)?/;
const reNumericOnly = /^\s*${embedRe(reNumeric)}\s*$/;
const reField = new RegExp(
  '\\s*([A-Za-z_\\.\\*.]+)' +
  `[\\s-!]*(${embedRe(reDate)})?` +
  `[\\s-!]*(${embedRe(reNumeric)})?` +
  '[\\s-!]*(.+?)?\\s*$'
);

const lower = str => str && str.toLowerCase ? str.toLowerCase() : str;

const startsWith = (lhs, rhs) => {
  return lhs && rhs && (
    lower(lhs) === lower(rhs) || new RegExp(`^${rhs}[\\s0-9]`, 'i').test(lhs)
  );
};

// Determines the TextForms type for the string.
const typeOf = str => {
  if (str.match(reNumericOnly)) {
    return str.match(reDecimal) ? 'numeric' : 'integer';
  }
  return 'string';
};

// Given a string `value` with type `type`, this function
// casts" `value` to the appropriate javascript type.
const formatAs = (type, value) => {
  switch (type) {
  case 'integer':
    return parseInt(value, 10);
  case 'numeric':
    return parseFloat(value);
  case 'date':
    return new Date(value).valueOf();
  default:
    return value;
  }
};

// Insert a result in to the TextForms result buffer.
// If a result for `key` already exists, the value is
// promoted to an array and multiple values are stored
// in the sequence that they appeared.
const setResult = (result, key, value) => {
  key = key.toLowerCase();
  if (result[key] === undefined) {
    // Single pair result
    if (value && value.values instanceof Array) {
      result[key] = value.values.join('');
    } else {
      result[key] = value;
    }
  } else if (result[key] instanceof Array) {
    // Second-or-later pair result
    result[key].push(value);
  } else {
    // First pair result
    result[key] = [ result[key], value ];
  }
};


/**
 * @param {(Object|String)} msg - sms_message document or sms message string
 * @returns {Object} - A parsed object of the sms message or an empty
 * object if parsing fails.
 */
exports.parse = msg => {
  if (!msg) {
    return {};
  }
  msg = msg.message || msg;
  const fields = msg.split(reBoundary);

  const results = {};
  fields.forEach(field => {
    // Process message component:
    // Each component has a key (which is the field's name), plus
    // either: (1) a value written with an explicit whitespace
    // separator (stored in `other`) or (2) a value written with
    // an implicit separator (in `numeric`, and never a string).
    const m = field.match(reField);

    // Empty component: Skip a completely-empty component (i.e. a non-match)
    if (!m) {
      return;
    }

    // Capture subgroups: These refer to the `reField` regular expression.

    const key = m[1];
    const date = m[2];
    let numeric = m[3];
    let other = m[4];

    // Whitespace-only value of `other`?:
    // Interpret as non-match, preventing pair formation (below).

    if (other !== undefined && other.trim() === '') {
      other = undefined;
    }

    // If `numeric` *and* `other` both match text:
    // This is either a field name that ends in a digit, a field
    // name with multiple values specified, or a single value in a
    // sequence (with an offset and value). This condition needs
    // to be disambiguated by comparing against a schema (later).
    if (other !== undefined && numeric !== undefined) {

      const numeric_type = typeOf(numeric);
      const other_type = typeOf(other);

      const result = {
        type: 'pair',
        values: [
          formatAs(numeric_type, numeric),
          formatAs(other_type, other)
        ],
      };

      setResult(results, key, result);
      return;
    }

    // Number written with explicit separator?
    // If there was an explicit space between the field's key
    // and a numeric value, "promote" the value to numeric.
    if (other && typeOf(other) !== 'string') {
      numeric = other;
      other = undefined;
    }

    // Data type detection:
    // Given numeric data, differentiate between an integer
    // and a decimal value. Otherwise, just store the string.
    if (numeric !== undefined) {

      const type = typeOf(numeric);

      // Differentiate integer from numeric:
      // The type here will never be string, per the regex.
      if (type === 'integer') {
        setResult(results, key, formatAs(type, numeric));
      } else {
        setResult(results, key, formatAs('numeric', numeric));
      }

    } else if (date !== undefined) {
      setResult(results, key, formatAs('date', date));
    } else {
      // Store string as-is
      setResult(results, key, other);
    }
  });

  return results;
};

/**
 * @param {Object} def The form definition for this msg
 * @param {(String|Object)} msg The message or an object with a 'message'
 *      property which contains the message
 * @returns {Object} A parsed object of the sms message or an empty
 *      object if parsing fails.
 */
exports.parseCompact = (def, msg) => {
  if (!msg || !def || !def.fields) {
    return {};
  }
  msg = msg.message || msg;
  let values = msg.match(/"[^"]+"|[^"\s]+/g);
  const keys = _.keys(def.fields);

  if (values.length > keys.length) {
    values = msg.match(/".+"|[^"\s]+/g);
  }

  const results = {};
  for (let i = 0; i < keys.length; i++) {
    if (values.length === 0) {
      break;
    }
    const key = keys[i];
    let value;
    if (i === keys.length - 1 && def.fields[key].type === 'string') {
      // parsing the trailing string field, use the rest of the msg
      value = values.join(' ');
    } else {
      value = values.shift();
    }
    if (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    if (typeof results[key] === 'undefined') {
      results[key] = value;
    }
  }
  return results;
};

/**
 * @param {Object} def The form definition for this msg
 * @param {(String|Object)} msg The message or an object with a 'message'
 *      property which contains the message
 * @param {String} locale The locale string
 * @returns {Boolean} Returns true if the given msg is in compact format
 */
exports.isCompact = (def, msg, locale) => {
  if (!msg || !def || !def.fields) {
    return false;
  }
  msg = msg.message || msg;
  const fields = msg.split(reBoundary);
  if (fields.length !== 1) {
    return false;
  }
  const labels = _.flatten(_.map(_.values(def.fields), field => {
    return [
      config.translate(field.labels && field.labels.tiny, locale),
      config.translate(field.labels && field.labels.short, locale)
    ];
  }));
  return !_.some(labels, label => startsWith(fields[0], label));
};

/**
 * @param {Object} doc - sms_message document
 * @returns {Array} - An array of values from the raw sms message
 */
exports.parseArray = doc => {

  const obj = exports.parse(doc);

  const arr = [];
  for (const key of obj) {
    arr.push(obj[key]);
  }

  // The fields sent_timestamp and from are set by the gateway, so they are
  // not included in the raw sms message and added manually.
  arr.unshift(doc.from);
  arr.unshift(doc.sent_timestamp);

  return arr;
};
