(function () {

  'use strict';

  angular.module('inboxDirectives', ['ngSanitize']);

  require('./actionbar');
  require('./auth');
  require('./content-row');
  require('./date-filter');
  require('./enketo');
  require('./enter');
  require('./facility-filter');
  require('./form-type-filter');
  require('./freetext-filter');
  require('./messages-list');
  require('./modal');
  require('./navigation');
  require('./report-image');
  require('./reports-list');
  require('./reset-filter');
  require('./sender');
  require('./show-muted-modal');
  require('./status-filter');

}());
