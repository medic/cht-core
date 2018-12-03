angular.module('inboxFilters').filter('partnerImage',
  function($sce, PartnerImages) {
    'use strict';
    'ngInject';
    return name => {
      return $sce.trustAsHtml(PartnerImages.getImg(name));
    };
  }
);
