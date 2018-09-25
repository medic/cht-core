var zscoreUtil,
    _ = require('underscore');

var getValue = function(resultObject) {
  if (!_.isObject(resultObject) || !resultObject.t) {
    return resultObject;
  }

  if (resultObject.t === 'arr') {
    return resultObject.v.length > 1 ? resultObject.v : resultObject.v[0];
  }

  return resultObject.v;
};

module.exports = {
  init: function(_zscoreUtil) {
    zscoreUtil = _zscoreUtil;
  },
  func: {
    'z-score': function(chartId, sex, x, y) {
      var result = zscoreUtil(getValue(chartId), getValue(sex), getValue(x), getValue(y));
      if (!result) {
          return { t: 'str', v: '' };
      }
      return { t: 'num', v: result };
    }
  }
};
