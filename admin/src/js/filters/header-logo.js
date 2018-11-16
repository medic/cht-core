angular.module('filters').filter('headerLogo',
  function($sce, LogoImages) {
    'use strict';
    'ngInject';
    return function(name) {
      return $sce.trustAsHtml(LogoImages.getImg(name));
    };
  }
);
