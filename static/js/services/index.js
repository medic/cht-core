(function () {

  'use strict';

  angular.module('inboxServices', ['ngResource']);

  require('./app-info');
  require('./base');
  require('./delete-message');
  require('./download-url');
  require('./facility');
  require('./form');
  require('./format-data-record');
  require('./generate-search-query');
  require('./mark-read');
  require('./read-messages');
  require('./search');
  require('./send-message');
  require('./settings');
  require('./update-facility');
  require('./user');
  require('./verified');

}());
