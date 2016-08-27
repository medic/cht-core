angular.module('inboxDirectives').directive('mmAuth', function($log, Auth) {
  'use strict';
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
