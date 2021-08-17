let zscoreUtil;

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
    return resultObject.v[0];
  }

  return resultObject.v;
};

const now_and_today = function() { return { t: 'date', v: new Date() }; };

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

const RAW_NUMBER = /^(-?[0-9]+)(\.[0-9]+)?$/;
const DATE_STRING = /^\d\d\d\d-\d{1,2}-\d{1,2}(?:T\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d))?$/;
const XPR = {
  boolean: function(val) { return { t:'bool', v:val }; },
  number: function(val) { return { t:'num', v:val }; },
  string: function(val) { return { t:'str', v:val }; },
  date: function(val) {
    if(!(val instanceof Date)) {
      throw new Error('Cannot create date from ' + val + ' (' + (typeof val) + ')');
    }
    return { t:'date', v:val };
  }
};

const _str = (r) => {
  return r.t === 'arr' ?
    r.v.length ? r.v[0].toString() : '' :
    r.v.toString();
};

const _date = (it) => {
  let temp;
  let t;

  if(it.v instanceof Date) {
    return new Date(it.v);
  }

  it = _str(it);

  if(RAW_NUMBER.test(it)) {
    // Create a date at 00:00:00 1st Jan 1970 _in the current timezone_
    temp = new Date(1970, 0, 1);
    temp.setDate(1 + parseInt(it, 10));
    return temp;
  } else if(DATE_STRING.test(it)) {
    t = it.indexOf('T');
    if(t !== -1) {
      it = it.substring(0, t);
    }
    temp = it.split('-');
    temp = new Date(temp[0], temp[1]-1, temp[2]);
    return temp;
  }
};

module.exports = {
  getTimezoneOffsetAsTime: getTimezoneOffsetAsTime,
  toISOLocalString: toISOLocalString,
  init: function(_zscoreUtil) {
    zscoreUtil = _zscoreUtil;
  },
  func: {
    now: now_and_today,
    today: now_and_today,
    'z-score': function() {
      const args = Array.from(arguments).map(function(arg) {
        return getValue(arg);
      });
      const result = zscoreUtil.apply(null, args);
      if (!result) {
        return { t: 'str', v: '' };
      }
      return { t: 'num', v: result };
    },
    'difference-in-months': function(d1, d2) {
      d1 = _date(d1);
      d2 = _date(d2);

      if(!d1 || !d2) {
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
