const { isNil } = require('lodash');

const DATE_STRING = /^\d\d\d\d-\d{1,2}-\d{1,2}(?:T\d\d:\d\d:\d\d\.?\d?\d?(?:Z|[+-]\d\d:\d\d)|.*)?$/;
const RAW_NUMBER = /^(-?[0-9]+)(\.[0-9]+)?$/;
const XPR = {
  number:  v => ({ t:'num',  v }),
  string:  v => ({ t:'str',  v }),
  date:    v => ({ t:'date', v }),
};

let zscoreUtil;
let toBikramSambat;
let moment;

const isObject = (value) => {
  const type = typeof value;
  return value !== null && (type === 'object' || type === 'function');
};

const getValue = function(resultObject) {
  if (!isObject(resultObject) || !resultObject.t) {
    return resultObject;
  }

  // input fields, evaluated as `UNORDERED_NODE_ITERATOR_TYPE`, are received as arrays with one element
  if (resultObject.t === 'arr' && resultObject.v.length) {
    return isNaN(resultObject.v[0]) ? asString(resultObject) : resultObject.v[0];
  }

  return resultObject.v;
};

const toISOLocalString = function(date) {
  if (date.toString() === 'Invalid Date') {
    return date.toString();
  }

  const dt = new Date(date.getTime() - (date.getTimezoneOffset() * 60 * 1000))
    .toISOString()
    .replace('Z', module.exports.getTimezoneOffsetAsTime(date));

  return dt;
};

const getTimezoneOffsetAsTime = function(date) {
  const pad2 = function(x) {
    return ( x < 10 ) ? '0' + x : x;
  };

  if (date.toString() === 'Invalid Date') {
    return date.toString();
  }

  const offsetMinutesTotal = date.getTimezoneOffset();

  const direction = (offsetMinutesTotal < 0) ? '+' : '-';
  const hours = pad2(Math.abs(Math.floor(offsetMinutesTotal / 60)));
  const minutes = pad2(Math.abs(Math.floor(offsetMinutesTotal % 60)));

  return direction + hours + ':' + minutes;
};

const parseTimestampToDate = (value) => {
  const timestamp = parseInt(getValue(value));

  if (isNaN(timestamp)) {
    return XPR.string('');
  }

  return XPR.date(new Date(timestamp));
};

const asString = (r) => {
  return r.t === 'arr' ?
    r.v.length && !isNil(r.v[0]) ? r.v[0].textContent || '' : '' :
    r.v.toString();
};

// Copied from https://github.com/enketo/openrosa-xpath-evaluator/blob/master/src/openrosa-extensions.js
const asDate = (r) => {
  let temp;
  const dateSinceUnixEpoch = (days) => {
    // Create a date at 00:00:00 1st Jan 1970 _in the current timezone_
    const date = new Date(1970, 0, 1);
    date.setDate(1 + days);
    return date;
  };
  switch (r.t) {
  case 'bool':
    return new Date(NaN);
  case 'date':
    return r.v;
  case 'num':
    return dateSinceUnixEpoch(r.v);
  case 'arr':
  default:
    r = asString(r);
    if (RAW_NUMBER.test(r)) {
      return dateSinceUnixEpoch(parseInt(r, 10));
    } else if (DATE_STRING.test(r)) {
      temp = r.indexOf('T');
      if (temp !== -1) {
        r = r.substring(0, temp);
      }
      temp = r.split('-');
      if (moment({ year: temp[0], month: temp[1], day: temp[2] }).isValid()) {
        const zeroPad = (n, len) => n.padStart(len || 2, '0');
        const time = `${zeroPad(temp[0])}-${zeroPad(temp[1])}-${zeroPad(temp[2])}` +
          'T00:00:00.000' + getTimezoneOffsetAsTime(new Date(r));
        return new Date(time);
      }
    }
    return new Date(r);
  }
};

const convertToBikramSambat = (value) => {
  const date = getValue(value);
  if (!date) {
    return { t: 'str', v: '' };
  }

  const convertedDate = toBikramSambat(moment(date));

  return { t: 'str', v: convertedDate };
};

module.exports = {
  getTimezoneOffsetAsTime: getTimezoneOffsetAsTime,
  toISOLocalString: toISOLocalString,
  init: function(_zscoreUtil, _toBikramSambat, _moment) {
    zscoreUtil = _zscoreUtil;
    toBikramSambat = _toBikramSambat;
    moment = _moment;
  },
  func: {
    today: function() {
      return XPR.date(new Date());
    },
    'z-score': function() {
      const args = Array.from(arguments).map(function(arg) {
        return getValue(arg);
      });
      const result = zscoreUtil.apply(null, args);
      if (!result) {
        return XPR.string('');
      }
      return XPR.number(result);
    },
    'to-bikram-sambat': convertToBikramSambat,
    'parse-timestamp-to-date': parseTimestampToDate, // Function name convention of XForm
    'difference-in-months': function(d1, d2) {
      d1 = asDate(d1);
      d2 = asDate(d2);

      const isValidDate = (d) => d instanceof Date && !isNaN(d);

      if(!d1 || !d2 || !isValidDate(d1) || !isValidDate(d2)) {
        return XPR.string('');
      }

      const months =
        ((d2.getFullYear() - d1.getFullYear()) * 12) +
        (d2.getMonth() - d1.getMonth()) +
        (d2.getDate() < d1.getDate() ? -1 : 0);
      return XPR.number(months);
    },
  },
  process: {
    toExternalResult: function(r) {
      if(r.t === 'date') {
        return {
          resultType: XPathResult.STRING_TYPE,
          numberValue: r.v.getTime(),
          stringValue: module.exports.toISOLocalString(r.v),
        };
      }
    }
  }
};
