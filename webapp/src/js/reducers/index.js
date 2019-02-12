(function() {
  var globalReducer = require('./global');
  var analyticsReducer = require('./analytics');

  module.exports = {
    global: globalReducer,
    analytics: analyticsReducer
  };
}());
