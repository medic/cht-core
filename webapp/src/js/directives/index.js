(function () {

  'use strict';

  angular.module('inboxDirectives', ['ngSanitize']);

  require('./auth');
  require('./content-row');
  require('./enketo');
  require('./modal');
  require('./report-image');
  require('./sender');
  require('./enter');
  require('./show-muted-modal');

}());
