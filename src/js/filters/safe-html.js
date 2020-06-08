angular.module('inboxFilters').filter('safeHtml',
  function($sce) {
    'use strict';
    'ngInject';
    return function(html) {
      return $sce.trustAsHtml(html);
    };
  }
);
