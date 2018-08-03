angular.module('inboxFilters').filter('integer', function() {
  'use strict';
  'ngInject';
  return function(number, maxDigits) {
    number = parseInt(number);
    maxDigits = parseInt(maxDigits);

    if (isNaN(number)) {
      return;
    }

    if (maxDigits > 0 && Math.abs(Math.ceil(number/10)) > maxDigits) {
      var max = Math.pow(10, maxDigits) - 1;
      return number > 0 ? max + '+' : '< -' + max;
    }

    return number + '';
  };
});
