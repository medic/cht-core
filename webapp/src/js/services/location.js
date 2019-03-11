angular.module('inboxServices').factory('Location',
  function($window) {

    'use strict';
    'ngInject';

    const location = $window.location;
    const dbName = 'medic';
    const path = '/';
    const adminPath = '/admin/';
    const port = location.port ? ':' + location.port : '';
    const url = location.protocol + '//' + location.hostname + port + '/' + dbName;

    return {
      path: path,
      adminPath: adminPath,
      dbName: dbName,
      url: url
    };
  }
);
