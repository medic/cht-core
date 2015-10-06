(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('BaseUrlService', function() {
    return function() {
      return $('html').data('base-url');
    };
  });

  inboxServices.factory('DbNameService', ['BaseUrlService',
    function(BaseUrlService) {
      return function() {
        var parts = BaseUrlService().split('/');
        if (parts.length > 1) {
          return parts[1];
        }
      };
    }
  ]);

}());