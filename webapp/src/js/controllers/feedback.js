var feedback = require('../modules/feedback');

angular.module('inboxControllers').controller('FeedbackCtrl',
  function (
    $scope,
    $translate,
    $uibModalInstance,
    APP_CONFIG,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    $scope.model = {};

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.submit = function() {
      $scope.setProcessing();
      feedback.submit($scope.model.message, APP_CONFIG, function(err) {
        if (err) {
          $scope.setError(err, 'Error saving feedback');
          return;
        }
        $scope.setFinished();
        $translate('feedback.submitted').then(Snackbar);
        $uibModalInstance.close();
      });
    };

  }
);
