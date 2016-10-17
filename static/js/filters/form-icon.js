var _ = require('underscore');

angular.module('inboxFilters').filter('formIcon', function(
  resourceIconFilter
) {
  'use strict';
  'ngInject';
  return function(record, forms) {
    if (record && forms && record.form) {
      var form = _.findWhere(forms, { code: record.form });
      return resourceIconFilter(form && form.icon);
    }
  };
});
