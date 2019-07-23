var zscoreUtil,
    _ = require('underscore');

var getValue = function(resultObject) {
  if (!_.isObject(resultObject) || !resultObject.t) {
    return resultObject;
  }

  // input fields, evaluated as `UNORDERED_NODE_ITERATOR_TYPE`, are received as arrays with one element
  if (resultObject.t === 'arr' && resultObject.v.length) {
    return resultObject.v[0];
  }

  return resultObject.v;
};

var now_and_today = function() { return { t: 'date', v: new Date() }; };

Date.prototype.toISOLocalString = function() {
    //2012-09-05T12:57:00.000-04:00 (ODK)

    if ( this.toString() === 'Invalid Date' ) {
        return this.toString();
    }

    var dt = new Date( this.getTime() - ( this.getTimezoneOffset() * 60 * 1000 ) ).toISOString()
        .replace( 'Z', this.getTimezoneOffsetAsTime() );

    if ( dt.indexOf( 'T00:00:00.000' ) > 0 ) {
        return dt.split( 'T' )[ 0 ];
    } else {
        return dt;
    }
};

Date.prototype.getTimezoneOffsetAsTime = function() {
    var offsetMinutesTotal;
    var hours;
    var minutes;
    var direction;
    var pad2 = function( x ) {
        return ( x < 10 ) ? '0' + x : x;
    };

    if ( this.toString() === 'Invalid Date' ) {
        return this.toString();
    }

    offsetMinutesTotal = this.getTimezoneOffset();

    direction = ( offsetMinutesTotal < 0 ) ? '+' : '-';
    hours = pad2( Math.abs( Math.floor( offsetMinutesTotal / 60 ) ) );
    minutes = pad2( Math.abs( Math.floor( offsetMinutesTotal % 60 ) ) );

    return direction + hours + ':' + minutes;
};

module.exports = {
  init: function(_zscoreUtil) {
    zscoreUtil = _zscoreUtil;
  },
  func: {
    now: now_and_today,
    today: now_and_today,
    'z-score': function() {
      var args = Array.from(arguments).map(function(arg) {
        return getValue(arg);
      });
      var result = zscoreUtil.apply(null, args);
      if (!result) {
          return { t: 'str', v: '' };
      }
      return { t: 'num', v: result };
    }
  },
  process: {
    toExternalResult: function(r) {
      if(r.t === 'date') {
        return {
          resultType:XPathResult.STRING_TYPE,
          numberValue:r.v.getTime(),
          stringValue:r.v.toISOLocalString(),
        };
      }
    }  
  }
};
