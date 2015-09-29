(function () {

  'use strict';

  angular.module('inboxFilters', ['ngSanitize']);

  require('./date');
  require('./directives');
  require('./message');
  require('./resource-icon');
  require('./translate-from');

}());