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

  module.filter('summary', function () {
    return function (record, forms) {
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

  module.filter('clinic', function () {
    return format.clinic;
  });

  module.filter('shortLabel', function() {
    return function(obj) {
      if (['clinic', 'health_center', 'district_hospital'].indexOf(obj.type) >= 0) {
        return obj.name;
      } else if (obj.code) {
        // a form object as returned from Form service
        return obj.code + ': ' + obj.name;
      }
      return obj.toString();
    };
  });

}());
