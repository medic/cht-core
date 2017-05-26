(function () {

  'use strict';

  angular.module('inboxDirectives', ['ngSanitize']);

  require('./auth');
  require('./enketo');
  require('./modal');
  require('./report-image');
  require('./sender');

}());
