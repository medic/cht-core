angular.module('inboxServices').factory('Location',
  function($window) {

    'use strict';
    'ngInject';

    var location = $window.location;
    var dbName = 'medic';
    var path = '/';
    var adminPath = '/admin/';
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
