// Integer filter that accepts an upper digit limit
angular.module('inboxFilters').filter('integer', function() {
  'use strict';
  'ngInject';
  return function(number, max) {
    number = parseInt(number);
    max = parseInt(max);

    if (isNaN(number)) {
      return;
    }

    if (max > 0 && number > max) {
      return max + '+';
    }

    return number.toString();
  };
});
