(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  var getFormName = function(message, forms) {
    for (var i = 0; i < forms.length; i++) {
      if (message.form === forms[i].code) {
        return forms[i].name;
      }
    }
    return message.form;
  };

  module.filter('summary', function () {
    return function (message, forms) {
      if (!message || !forms) { 
        return '';
      }
      if (message.form) {
        return getFormName(message, forms);
      }
      if (message.sms_message) {
        return message.sms_message.message;
      }
      if (message.tasks &&
          message.tasks[0] &&
          message.tasks[0].messages &&
          message.tasks[0].messages[0]) {
        return message.tasks[0].messages[0].message;
      }
      return 'Message';
    };
  });

  module.filter('title', function () {
    return function (message, forms) {
      if (!message || !forms) { 
        return '';
      }
      if (message.form) {
        return getFormName(message, forms);
      }
      if (message.kujua_message) {
        return 'Outgoing Message';
      }
      return 'Incoming Message';
    };
  });

}());