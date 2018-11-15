angular.module('filters').filter('logoImages',
  function($sce, ResourceIcons) {
    'use strict';
    'ngInject';
    return function(name) {
      return $sce.trustAsHtml(ResourceIcons.getImg(name));
    };
  }
);
