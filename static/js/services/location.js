angular.module('inboxServices').factory('Location',
  function($window) {

    'use strict';
    'ngInject';

    var getDbName = function(path) {
      var parts = path.split('/');
      if (parts.length > 1) {
        return parts[1];
      }
    };

    var getUrl = function(dbName) {
      var loc = $window.location;
      var port = loc.port ? ':' + loc.port : '';
      return loc.protocol + '//' + loc.hostname + port + '/' + dbName;
    };

    var path = $('html').data('base-url');
    var dbName = getDbName(path);
    var url = getUrl(dbName);

    return {
      path: path,
      dbName: dbName,
      url: url
    };
  }
);
