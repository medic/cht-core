angular.module('controllers').controller('MainCtrl',
  function (
    $log,
    $translate,
    $window,
    Auth,
    $scope,
    Session,
    BrandingImages
  ) {
    'ngInject';
    $translate.use('en');
    Auth('can_configure').catch(function() {
      $log.error('Insufficient permissions. Must be either "admin" or "nationalAdmin".');
      $window.location.href = '../../../login';
    });

    $scope.logout = function() {
      Session.logout();
    };

    BrandingImages.getAppTitle().then(title => {
      document.title = `${title} | admin console`;
    });
  }
);
