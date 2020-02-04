const format = require('../modules/format');
const _ = require('lodash');

(function () {

  'use strict';

  const getFormName = function(record, forms) {
    const form = _.find(forms, { code: record.form });
    if (form) {
      return form.title;
    }
    return record.form;
  };

  angular.module('inboxFilters').filter('summary', function(
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

  angular.module('inboxFilters').filter('title', function(
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

  angular.module('inboxFilters').filter('clinic', function(
    $log,
    $state
  ) {
    'ngInject';
    return function(entity) {
      $log.warn('`clinic` filter is deprecated. Use `lineage` filter instead.');
      return format.lineage(entity, $state);
    };
  });

  angular.module('inboxFilters').filter('lineage', function(
    $state
  ) {
    'ngInject';
    return function(entity) {
      return format.lineage(entity, $state);
    };
  });

}());
