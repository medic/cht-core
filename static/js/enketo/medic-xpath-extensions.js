var zscoreUtil;

module.exports = {
  init: function(_zscoreUtil) {
    zscoreUtil = _zscoreUtil;
  },
  func: {
    'z-score': function(chartId, sex, x, y) {
      var result = zscoreUtil(chartId, sex, x, y);
      if (!result) {
          return { t: 'str', v: '' };
      }
      return { t: 'num', v: result };
    }
  }
};
