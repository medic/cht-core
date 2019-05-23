angular.module('controllers').controller('MainCtrl',
  function (
    $log,
    $scope,
    $state,
    $translate,
    $window,
    Auth,
    Location,
    Session
  ) {
    'ngInject';
    $translate.use('en');
    $scope.authorized = false;
    $scope.navbarCollapsed = true;
    Auth('can_configure')
    .then(function() {
      $scope.authorized = true;
    })
    .catch(function() {
      $log.error('Insufficient permissions. Must be either "admin" or "nationalAdmin".');
      $window.location.href = Location.path;
    });


    $scope.webAppUrl = Location.path;
    $scope.logout = function() {
      Session.logout();
    };
    $scope.checkActive = state => {
      if (state === 'targets' && $state.is('targets-edit')) {
        // a special case for a route that doesn't match our usual pattern
        return true;
      }
      return $state.includes(state);
    };
  }
);
