(function () {

  'use strict';

  angular.module('inboxDirectives', ['ngSanitize']);

  require('./auth');
  require('./autoreply');
  require('./content-row');
  require('./enketo');
  require('./full-date');
  require('./modal');
  require('./report-image');
  require('./sender');
  require('./task-state');
  require('./task-state-with-recipient');
  require('./time-ago-auto-update');
  require('./relative-date');

}());
