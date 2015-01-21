(function () {

  'use strict';

  angular.module('inboxFilters', ['ngSanitize']);

  require('./date');
  require('./message');
  require('./directives');
  require('./translate-from');

}());