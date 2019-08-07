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

// todo test this
const difference = (array1, array2) => {
  array1 = array1.sort();
  array2 = array2.sort();

  const diff = [];
  let i = 0;
  let j = 0;
  while (i < array1.length) {
    if (j >= array2.length || array1[i] < array2[j]) {
      diff.push(array1[i]);
      i++;
    } else if (array1[i] === array2[j]) {
      i++;
      j++;
    } else {
      j++;
    }
  }

  return diff;
};

module.exports = {
  parseDate: parseDate,
  isDateStrValid: isDateStrValid,
  difference,
};
