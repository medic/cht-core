var session = require('session');

(function () {

  'use strict';
  
  var inboxServices = angular.module('inboxServices');

  // wrapper so these can be injected for unit testing
  inboxServices.value('KansoPackages', {
    session: session
  });
  
}());