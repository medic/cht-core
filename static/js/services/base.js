var db = require('db'),
    audit = require('couchdb-audit/kanso');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('db',
    function() {
      var result = db.current();
      require('views/lib/couchfti').addFTI(result);
      return result;
    }
  );

  inboxServices.factory('audit', ['db',
    function(db) {
      return audit.withKanso(db);
    }
  ]);

  inboxServices.factory('RememberService', function() {
    return {
      scrollTop: undefined,
      dateFormat: 'DD-MMM-YYYY hh:mm'
    };
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