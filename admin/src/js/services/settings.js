angular.module('services').factory('Settings',
  function(
    DB
  ) {

    'use strict';
    'ngInject';

    return function() {
      return DB()
        .get('_design/medic-client')
        .then(function(ddoc) {
          return ddoc.app_settings;
        });
    };
  }
);
