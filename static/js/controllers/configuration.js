(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationCtrl',
    ['$scope', '$state', 'Auth',
    function ($scope, $state, Auth) {
      if (!$state.is('configuration.user')) {
        Auth('can_configure').catch(function(err) {
          console.log('Insufficient permissions. Must be either "admin" or "nationalAdmin".', err);
          $state.go('error', { code: 403 });
        });
      }
    }
  ]);

}());