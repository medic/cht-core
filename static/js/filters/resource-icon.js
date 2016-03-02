(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.filter('resourceIcon', [
    'ResourceIcons',
    function(ResourceIcons) {
      return ResourceIcons.getImg;
    }
  ]);

}());
