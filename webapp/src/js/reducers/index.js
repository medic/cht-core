(function() {
  var globalReducer = require('./global');
  var analyticsReducer = require('./analytics');
  var contactsReducer = require('./contacts');

  module.exports = {
    global: globalReducer,
    analytics: analyticsReducer,
    contacts: contactsReducer
  };
}());
