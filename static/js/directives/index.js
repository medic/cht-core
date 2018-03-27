(function () {

  'use strict';

  angular.module('inboxDirectives', ['ngSanitize']);

  require('./auth');
  require('./auth-group');
  require('./content-row');
  require('./enketo');
  require('./modal');
  require('./report-image');
  require('./sender');
  require('./enter');

}());
