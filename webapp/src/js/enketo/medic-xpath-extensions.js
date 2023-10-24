const RAW_NUMBER = /^(-?[0-9]+)(\.[0-9]+)?$/;
const DATE_STRING = /^\d\d\d\d-\d{1,2}-\d{1,2}(?:T\d\d:\d\d:\d\d\.?\d?\d?(?:Z|[+-]\d\d:\d\d)|.*)?$/;
const XPR = {
  number: v => ({ t: 'num',  v }),
  string: v => ({ t: 'str',  v }),
  date: v => ({ t: 'date', v }),
};

let zscoreUtil;
let toBikramSambat;
let moment;
let chtScriptApi;

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
  if (r.t !== 'arr') {
    return r.v.toString();
  }
  if (r.v.length && !(r.v[0] === null || r.v[0] === undefined)) {
    return r.v[0].textContent || '';
  }
  return '';
};

// Based on https://github.com/enketo/openrosa-xpath-evaluator/blob/3bfcb493ec01cf84f55e254a096a31e5be01de15/src/openrosa-extensions.js#L547
const asMoment = (r) => {
  const dateSinceUnixEpoch = (days) => {
    // Create a date at 00:00:00 1st Jan 1970 _in the current timezone_
    const date = new Date(1970, 0, 1);
    date.setDate(1 + days);
    return moment(date);
  };
  switch (r.t) {
  case 'bool':
    return moment(NaN);
  case 'date':
    return moment(r.v);
  case 'num':
    return dateSinceUnixEpoch(r.v);
  case 'arr':
  default: {
    r = asString(r);
    if (RAW_NUMBER.test(r)) {
      return dateSinceUnixEpoch(parseInt(r, 10));
    }
    const rMoment = moment(r);
    if (DATE_STRING.test(r) && rMoment.isValid()) {
      if (r.indexOf('T')) {
        return rMoment;
      }

      const rDate = rMoment.format('YYYY-MM-DD');
      const time = `${rDate}T00:00:00.000${getTimezoneOffsetAsTime(new Date(rDate))}`;
      return moment(time);
    }
    return moment(r);
  }
  }
};

const convertToBikramSambat = (value) => {
  const vMoment = asMoment(value);
  if (!vMoment.isValid()) {
    return { t: 'str', v: '' };
  }

  const convertedDate = toBikramSambat(vMoment);

  return { t: 'str', v: convertedDate };
};

const addDate = function (date, years, months, days, hours, minutes) {
  if (arguments.length > 6) {
    throw new Error('Too many arguments.');
  }
  const moment = asMoment(date);
  [
    [years, 'years'],
    [months, 'months'],
    [days, 'days'],
    [hours, 'hours'],
    [minutes, 'minutes'],
  ].filter(([value]) => value)
    .map(([value, name]) => ([ +asString(value), name ]))
    .filter(([value]) => value)
    .forEach(([value, name]) => moment.add(value, name));
  return XPR.date(moment.toDate());
};

module.exports = {
  getTimezoneOffsetAsTime: getTimezoneOffsetAsTime,
  toISOLocalString: toISOLocalString,
  init: function(_zscoreUtil, _toBikramSambat, _moment, _chtScriptApi) {
    zscoreUtil = _zscoreUtil;
    toBikramSambat = _toBikramSambat;
    moment = _moment;
    chtScriptApi = _chtScriptApi;
  },
  func: {
    'add-date': addDate,
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
      const d1Moment = asMoment(d1);
      const d2Moment = asMoment(d2);

      if (!d1Moment.isValid() || !d2Moment.isValid()) {
        return XPR.string('');
      }

      const months = d2Moment.diff(d1Moment, 'months');
      return XPR.number(months);
    },
    'cht:extension-lib': function() {
      const args = Array.from(arguments);
      const firstArg = args.shift();
      const libId = firstArg && firstArg.v;
      const lib = libId && chtScriptApi.v1.getExtensionLib(libId);
      if (!lib) {
        throw new Error(`Form configuration error: no extension-lib with ID "${libId}" found`);
      }
      return lib.apply(null, args);
    }
  },
  process: {
    toExternalResult: function(r) {
      if (r.t === 'date') {
        return {
          resultType: XPathResult.STRING_TYPE,
          numberValue: r.v.getTime(),
          stringValue: module.exports.toISOLocalString(r.v),
        };
      }
    }
  }
};
