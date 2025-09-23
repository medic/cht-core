angular.module('filters').filter('buildVersion',
  function(
  ) {
    'use strict';
    'ngInject';

    return function(buildInfo) {
      if (buildInfo) {
        return buildInfo.version;
      }
    };
  });
