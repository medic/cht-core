const moment = require('moment');

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

module.exports = {
  parseDate: parseDate,
  isDateStrValid: isDateStrValid,
};
