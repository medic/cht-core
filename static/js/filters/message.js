var format = require('../modules/format');

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

  module.filter('summary', ['$translate',
    function($translate) {
      return function(record, forms) {
        if (!record || !forms) {
          return '';
        }
        if (record.form) {
          return getFormName(record, forms);
        }
        if (record.message && record.message.message) {
          return record.message.message;
        }
        if (record.tasks &&
            record.tasks[0] &&
            record.tasks[0].messages &&
            record.tasks[0].messages[0]) {
          return record.tasks[0].messages[0].message;
        }
        return $translate.instant('tasks.0.messages.0.message');
      };
    }
  ]);

  module.filter('title', ['$translate',
    function($translate) {
      return function(message, forms) {
        if (!message || !forms) {
          return '';
        }
        if (message.form) {
          return getFormName(message, forms);
        }
        if (message.kujua_message) {
          return $translate.instant('Outgoing Message');
        }
        return $translate.instant('sms_message.message');
      };
    }
  ]);

  module.filter('clinic', function () {
    return format.clinic;
  });

}());
