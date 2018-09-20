angular.module('inboxServices').factory('Location',
  function($window) {

    'use strict';
    'ngInject';

    var location = $window.location;
    var dbName = location.pathname.split('/')[1];
    var path = '/' + dbName + '/_design/medic/_rewrite';
    var adminPath = '/' + dbName + '/_design/medic-admin/_rewrite';
    var port = location.port ? ':' + location.port : '';
    var url = location.protocol + '//' + location.hostname + port + '/' + dbName;

    return {
      path: path,
      adminPath: adminPath,
      dbName: dbName,
      url: url
    };
  }
);
