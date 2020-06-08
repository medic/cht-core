angular.module('inboxFilters').filter('formIcon', function(
  formIconNameFilter,
  resourceIconFilter
) {
  'use strict';
  'ngInject';
  return function(record, forms) {
    return resourceIconFilter(formIconNameFilter(record, forms));
  };
});
