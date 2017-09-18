angular.module('inboxFilters').filter('formIcon', function(
  formIconName,
  resourceIconFilter
) {
  'use strict';
  'ngInject';
  return function(record, forms) {
    return resourceIconFilter(formIconName(record, forms));
  };
});
