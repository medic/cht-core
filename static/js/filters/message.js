var format = require('../modules/format'),
    _ = require('underscore');

(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  var getFormName = function(record, forms) {
    var form = _.findWhere(forms, { code: record.form });
    if (form) {
      return form.title;
    }
    return record.form;
  };

  module.filter('summary', function(
    $translate
  ) {
    'ngInject';
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
  });

  module.filter('title', function(
    $translate
  ) {
    'ngInject';
    return function(record, forms) {
      if (!record || !forms) {
        return '';
      }
      if (record.form) {
        return getFormName(record, forms);
      }
      if (record.kujua_message) {
        return $translate.instant('Outgoing Message');
      }
      return $translate.instant('sms_message.message');
    };
  });

  module.filter('clinic', function(
    $log,
    $state
  ) {
    'ngInject';
    return function(entity) {
      $log.warn('`clinic` filter is deprecated. Use `lineage` filter instead.');
      return format.lineage(entity, $state);
    };
  });

  module.filter('lineage', function(
    $state
  ) {
    'ngInject';
    return function(entity) {
      return format.lineage(entity, $state);
    };
  });

}());
