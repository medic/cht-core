(function () {

  'use strict';

  angular.module('inboxServices', ['ngResource']);

  require('./analytics-modules');
  require('./app-info');
  require('./auth');
  require('./base');
  require('./changes');
  require('./conflict-resolution');
  require('./count-messages');
  require('./db');
  require('./db-sync');
  require('./db-view');
  require('./delete-doc');
  require('./download-url');
  require('./edit-group');
  require('./facility');
  require('./form');
  require('./format-data-record');
  require('./format-date');
  require('./generate-search-query');
  require('./generate-search-requests');
  require('./http-wrapper');
  require('./import-contacts');
  require('./kanso-packages');
  require('./language');
  require('./mark-read');
  require('./message-contacts');
  require('./message-state');
  require('./outgoing-messages-configuration');
  require('./properties');
  require('./read-messages');
  require('./search');
  require('./send-message');
  require('./session');
  require('./settings');
  require('./update-contact');
  require('./update-facility');
  require('./update-settings');
  require('./user');
  require('./verified');

}());
