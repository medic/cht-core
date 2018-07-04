var _ = require('lodash');

angular.module('inboxFilters').filter('formIconName', function() {
  'use strict';
  'ngInject';
  return function(record, forms) {
    if (record && forms && record.form) {
      var form = _.findWhere(forms, { code: record.form });
      return form && form.icon;
    }
  };
});
