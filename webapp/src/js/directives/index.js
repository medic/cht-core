(function () {

  'use strict';

  angular.module('inboxDirectives', ['ngSanitize']);

  require('./actionbar');
  require('./analytics-filters');
  require('./analytics-targets-details');
  require('./analytics-targets-progress');
  require('./auth');
  require('./contacts-list');
  require('./content-row');
  require('./date-filter');
  require('./enketo');
  require('./enter');
  require('./facility-filter');
  require('./form-type-filter');
  require('./freetext-filter');
  require('./header');
  require('./messages-list');
  require('./modal');
  require('./navigation');
  require('./privacy-policy');
  require('./report-image');
  require('./reports-list');
  require('./reset-filter');
  require('./sender');
  require('./show-muted-modal');
  require('./simprints-filter');
  require('./sort-filter');
  require('./startup-modals');
  require('./status-filter');
  require('./tasks-list');

}());
