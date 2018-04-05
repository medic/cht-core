const _ = require('underscore'),
      moment = require('moment'),
      db = require('../db-nano');

const DATETIME_FORMATS = [
  'YYYY-MM-DDTHH:mm:ssZ',
  'YYYY-MM-DDTHH:mm:ss.SSSZ', // native JS Date.toISOString format
  'x' // ms since epoch (stored format)
];

const parseDate = function(str) {
  return moment(str, DATETIME_FORMATS, true);
};

const isDateStrValid = function(str) {
  return parseDate(str).isValid();
};

const fti = function(index, options, callback) {
  const queryOptions = _.pick(options, 'q', 'sort', 'skip', 'limit', 'include_docs');
  db.fti(index, queryOptions, function(err, result) {
    if (err) {
      return callback(err);
    }
    if (!result) {
      result = { total_rows: 0, rows: [] };
    } else if (!result.rows) {
      result.rows = [];
    }
    callback(null, result);
  });
};

module.exports = {
  fti: fti,
  parseDate: parseDate,
  isDateStrValid: isDateStrValid
};
