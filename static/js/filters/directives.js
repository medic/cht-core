(function () {

  'use strict';

  var module = angular.module('inboxFilters');

  module.directive('mmSender', function() {
    return {
      restrict: 'E',
      scope: { message: '=' },
      templateUrl: 'templates/partials/sender.html'
    };
  });

  module.directive('mmAuth', function($log, Auth) {
    'ngInject';
    var link = function(scope, element, attributes) {
      element.addClass('hidden');
      Auth(attributes.mmAuth.split(','))
        .then(function() {
          element.removeClass('hidden');
        })
        .catch(function(err) {
          if (err) {
            $log.error('Error checking authorization', err);
          }
          element.addClass('hidden');
        });
    };
    return {
      restrict: 'A',
      link: link
    };
  });

}());