angular.module('filters').filter('headerLogo',
  function($sce, BrandingImages) {
    'use strict';
    'ngInject';
    return function(name) {
      return $sce.trustAsHtml(BrandingImages.getLogo(name));
    };
  }
);
