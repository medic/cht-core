(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ReportsAddCtrl', 
    ['$scope', '$state', 'Enketo',
    function ($scope, $state, Enketo) {
      $scope.loadingContent = true;
      $scope.setSelected({ form: $state.params.id });
      // TODO unload enketo resources on navigate away
      // TODO angularify this
      var formWrapper = $('#report-form');
      Enketo.render(formWrapper, $state.params.id)
        .then(function(form) {
          $scope.form = form;
          $scope.loadingContent = false;
          formWrapper.show();
          $scope.$apply();
        })
        .catch(function(err) {
          $scope.loadingContent = false;
          console.error('Error loading form.', err);
          $scope.$apply();
        });

    }
  ]);

}());
