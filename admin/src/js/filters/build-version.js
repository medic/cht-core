angular.module('filters').filter('buildVersion',
  function(
  ) {
    'use strict';
    'ngInject';

    return function(buildInfo, displayBaseVersion {
      if (buildInfo) {
        if (buildInfo.version === buildInfo.base_version || !buildInfo.base_version) {
          return buildInfo.version;
        } else if (displayBaseVersion) {
          return buildInfo.base_version;
        } else {
          return buildInfo.version + ' (~' + buildInfo.base_version + ')';
        }
      }
    };
  }
);
