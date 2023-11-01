angular.module('filters').filter('buildVersion',
  function(
  ) {
    'use strict';
    'ngInject';

    return function(buildInfo) {
      if (buildInfo) {
        if (buildInfo.version === buildInfo.base_version || !buildInfo.base_version) {
          return buildInfo.version;
        }
        return buildInfo.version + ' (~' + buildInfo.base_version + ')';
      }
    };
  });
