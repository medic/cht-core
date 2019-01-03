var feedback = require('../modules/feedback');

angular.module('inboxControllers').controller('FeedbackCtrl',
  function (
    $q,
    $scope,
    $translate,
    $uibModalInstance,
    APP_CONFIG,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    $scope.model = {};
    $scope.error = {};

    var translateRequiredField = function(fieldKey) {
      return $translate(fieldKey).then(function(field) {
        return $translate('field is required', { field: field });
      });
    };

    var validateMessage = function(message) {
      if (message) {
        $scope.error.message = false;
      } else {
        return translateRequiredField('Bug\ description')
          .then(function(error) {
            $scope.error.message = error;
          });
      }
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.submit = function() {
      $scope.setProcessing();

      var message = $scope.model.message && $scope.model.message.trim();
      $q.all([
        validateMessage(message)
      ])
      .then(function() {
        if (!$scope.error.message) {
          feedback.submit(message, APP_CONFIG, function(err) {
            if (err) {
              $scope.setError(err, 'Error saving feedback');
              return;
            }
            $scope.setFinished();
            $translate('feedback.submitted').then(Snackbar);
            $uibModalInstance.close();
          });
        }
        $scope.setFinished();
      });
    };

  }
);
