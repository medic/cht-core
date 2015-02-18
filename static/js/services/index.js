(function () {

  'use strict';

  angular.module('inboxServices', ['ngResource']);

  require('./analytics-modules');
  require('./app-info');
  require('./base');
  require('./changes');
  require('./db-view');
  require('./delete-message');
  require('./download-url');
  require('./edit-group');
  require('./facility');
  require('./form');
  require('./format-data-record');
  require('./format-date');
  require('./generate-search-query');
  require('./mark-read');
  require('./message-contacts');
  require('./message-state');
  require('./outgoing-messages-configuration');
  require('./properties');
  require('./read-messages');
  require('./search');
  require('./send-message');
  require('./settings');
  require('./update-facility');
  require('./update-settings');
  require('./user');
  require('./verified');

}());
