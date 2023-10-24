/**
 * @module mp-parser
 */
const _ = require('lodash');

const zip = (a, b) => {
  const zipped = [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    zipped[i] = [a[i], b[i]];
  }
  return zipped;
};

/**
 * @param {Object} def - forms form definition
 * @param {Object} doc - sms_message document
 * @returns {Object} - A parsed object of the sms message or an empty
 * object if parsing fails.
 */
exports.parse = (def, doc) => {
  const parts = doc.message.split('#');
  const header = parts[0].split('!');
  const vals = parts.slice(1);

  let n = 3;
  while (n < header.length) {
    header[2] += '!' + header[n++];
  }

  vals.unshift(header[2]);

  if (!def || !def.fields) {
    return {};
  }

  // put field and values into paired array
  const pairs = zip(
    // include key value in paired array
    _.map(def.fields, (val, key) => {
      const field = def.fields[key];
      field._key = key;
      return field;
    }),
    vals
  );

  return pairs.reduce((obj, v) => {
    const field = v[0];
    const val = v[1];

    if (!field) {
      // ignore extra form data that has no matching field definition.
      obj._extra_fields = true;
    } else {
      obj[field._key] = typeof val === 'string' ? val.trim() : val;
    }

    return obj;
  }, {});
};
