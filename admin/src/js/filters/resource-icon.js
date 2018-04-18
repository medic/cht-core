angular.module('filters').filter('resourceIcon',
  function($sce, ResourceIcons) {
    'use strict';
    'ngInject';
    return function(name) {
      return $sce.trustAsHtml(ResourceIcons.getImg(name));
    };
  }
);
