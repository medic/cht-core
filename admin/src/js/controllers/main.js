angular.module('controllers').controller('MainCtrl',
  function (
    $log,
    $scope,
    $state,
    $window,
    Auth,
    Language,
    Location,
    Session,
    SetLanguage
  ) {
    'ngInject';

    // Override $window.PouchDB.fetch
    const dbFetch = $window.PouchDB.fetch;
    $window.PouchDB.fetch = function() {
      return dbFetch.apply(this, arguments)
        .then(function(response) {
          if (response.status === 401) {
            Session.navigateToLogin();
          }
          return response;
        });
    };

    Language().then(locale => SetLanguage(locale));
    $scope.authorized = false;
    $scope.navbarCollapsed = true;
    Auth.any([['can_configure'], ['can_view_outgoing_messages'], ['can_export_all']])
      .then(isAuthorized => {
        $scope.authorized = isAuthorized;

        if (!isAuthorized) {
          $log.error('Insufficient permissions. Must be either "admin" or "nationalAdmin".');
          $window.location.href = Location.path;
        }
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
