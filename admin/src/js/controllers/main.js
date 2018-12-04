angular.module('controllers').controller('MainCtrl',
  function (
    $log,
    $translate,
    $window,
    Auth,
    $scope,
    Session
  ) {
    'ngInject';
    $translate.use('en');
    $scope.authorized = false;
    Auth('can_configure')
    .then(function() {
      $scope.authorized = false;
    })
    .catch(function() {
      $log.error('Insufficient permissions. Must be either "admin" or "nationalAdmin".');
      $window.location.href = '../../login';
    });

    $scope.logout = function() {
      Session.logout();
    };
  }
);
