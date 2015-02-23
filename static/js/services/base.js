var db = require('db');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('db', function() {
    return db.current();
  });

  inboxServices.factory('BaseUrlService', function() {
    return function() {
      return $('html').data('base-url');
    };
  });

  inboxServices.factory('UserCtxService', function() {
    return function() {
      return $('html').data('user');
    };
  });

}());