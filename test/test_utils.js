var _ = require('underscore');

// Restore a list of sinon-mocked functions
exports.restore = function(fns) {
  fns.forEach(function(fn) {
    if (fn && fn.restore) {
      fn.restore();
    }
  });
};

// Restore all top-level functions that are sinon-mocked against a given object
exports.restoreAll = function(obj) {
  _.each(obj, function(key) {
    if (_.isFunction(obj[key])) {
      if (_.isFunction(obj[key].restore)) {
        obj[key].restore();
      }
    }
  });
};
