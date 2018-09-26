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

module.exports = {
  init: function(_zscoreUtil) {
    zscoreUtil = _zscoreUtil;
  },
  func: {
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
  }
};
