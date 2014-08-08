(function () {

  'use strict';

  angular.module('inboxServices', ['ngResource']);

  require('./base');
  require('./facility');
  require('./form');
  require('./user');
  require('./settings');
  require('./generate-search-query');
  require('./send-message');
  require('./read-messages');
  require('./mark-read');
  require('./update-facility');
  require('./verified');
  require('./delete-message');

}());
