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

/**
 * Compute a list of elements that exist in array1 and do no exist in array2.
 * Much more performant than underscore's alternative (for 20000 vs 15000 uuids array, runtime is 1106ms vs 15ms)
 * @param {Array} array1
 * @param {Array} array2
 * @returns {Array}
 */

const difference = (array1, array2) => {
  array1 = array1.sort();
  array2 = array2.sort();

  const diff = [];
  let i = 0;
  let j = 0;
  while (i < array1.length) {
    const a1 = String(array1[i]);
    const a2 = String(array2[j]);
    if (j >= array2.length || a1 < a2) {
      diff.push(array1[i]);
      i++;
    } else if (a1 === a2) {
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
