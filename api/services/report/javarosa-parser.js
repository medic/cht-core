const _ = require('underscore'),
          config = require('../../config');

/**
 * Custom Medic Mobile Javarosa message parser.
 *
 * @param {Object} def - forms form definition
 * @param {Object} doc - sms_message document
 * @returns {Object|{}} - A parsed object of the sms message or an empty
 * object if parsing fails.
 *
 * @api public
 */
exports.parse = (def, doc) => {
  const data = doc.message.split('!').slice(2).join('!'),
        labels = [],
        vals = [],
        obj = {};

  // Split on hash '#' unless it is escaped.  Use uncommon string as
  // placeholder.
  const parts = data.replace(/([^\\])#/g, '$1\u000B').split('\u000B');

  if(!def || !def.fields) {
    return {};
  }

  // collect tiny labels
  for (let i = 0, len = parts.length; i < len; ++i) {
    if (i % 2 === 0) {
      // trim whitespace here so label match below works. allows
      // whitespace in label submission
      labels.push(parts[i].trim());
    } else {
      vals.push(parts[i]);
    }
  }

  /*
   * Loop through form definition fields and build object when tiny label
   * matches. Also in field values remove escape characters on escaped
   * delimiters.
   */
  _.each(def.fields, (field, key) => {
    // ignore fields without tiny labels
    if (!field.labels || !field.labels.tiny) {
      return;
    }
    const label = config.translate(field.labels.tiny);
    for (let i = 0; i < labels.length && i < vals.length; i++) {
      if (labels[i].match(new RegExp(`^${label}$`, 'i'))) {
        obj[key] = vals[i].replace(/\\#/g, '#');
      }
    }
  });

  return obj;
};
