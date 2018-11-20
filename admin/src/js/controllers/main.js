angular.module('controllers').controller('MainCtrl',
  function (
    $log,
    $scope,
    $translate,
    $window,
    Auth,
    BrandingImages
  ) {
    'ngInject';
    $translate.use('en');
    Auth('can_configure').catch(function() {
      $log.error('Insufficient permissions. Must be either "admin" or "nationalAdmin".');
      $window.location.href = '../../../login';
    });
    BrandingImages.getAppTitle().then(title => {
      $scope.title = `${title} | admin console`;
    })
  }
);
