var db = require('db');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('db', function() {
    var result = db.current();
    require('views/lib/couchfti').addFTI(result);
    return result;
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