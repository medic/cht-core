angular.module('controllers').controller('MainCtrl',
  function (
    $log,
    $translate,
    Auth
  ) {
    'ngInject';
    $translate.use('en');
    Auth('can_configure').catch(function(err) {
      $log.error('Insufficient permissions. Must be either "admin" or "nationalAdmin".', err);
    });
  }
);
