(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationCtrl',
    function (
      $log,
      $scope,
      $state,
      Auth
    ) {
      'ngInject';
      if (!$state.is('configuration.user')) {
        Auth('can_configure').catch(function(err) {
          $log.error('Insufficient permissions. Must be either "admin" or "nationalAdmin".', err);
          $state.go('error', { code: 403 });
        });
      }
    }
  );

}());