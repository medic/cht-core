angular.module('inboxFilters').filter('integer', function() {
  'use strict';
  'ngInject';
  return function(number, maxDigits) {
    number = parseInt(number);
    maxDigits = parseInt(maxDigits);

    if (isNaN(number)) {
      return;
    }

    if (number > 0 && maxDigits > 0 && number.toString().length > maxDigits) {
      var max = Math.pow(10, maxDigits) - 1;
      return max + '+';
    }

    return number + '';
  };
});
