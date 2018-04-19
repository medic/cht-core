angular.module('inboxServices').factory('Location',
  function($window) {

    'use strict';
    'ngInject';

    var getDbName = function() {
      return $window.location.pathname.split('/')[1];
    };

    var getUrl = function(dbName) {
      var loc = $window.location;
      var port = loc.port ? ':' + loc.port : '';
      return loc.protocol + '//' + loc.hostname + port + '/' + dbName;
    };

    var dbName = getDbName();
    var path = dbName + '/_design/medic';
    var url = getUrl(dbName);

    return {
      path: path,
      dbName: dbName,
      url: url
    };
  }
);
