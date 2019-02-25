angular.module('inboxControllers').controller('FeedbackCtrl',
  function (
    $q,
    $scope,
    $translate,
    $uibModalInstance,
    Translate,
    Snackbar,
    Feedback
  ) {

    'use strict';
    'ngInject';

    $scope.model = {};
    $scope.error = {};

    var validateMessage = function(message) {
      if (message) {
        $scope.error.message = false;
        return $q.resolve();
      } else {
        return Translate.fieldIsRequired('Bug description')
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
      return validateMessage(message)
        .then(function() {
          const p = $q.defer();

          if (!$scope.error.message) {
            Feedback.submit(message, true, function(err) {
              if (err) {
                $scope.setError(err, 'Error saving feedback');
                p.reject();
                return;
              }
              $scope.setFinished();

              $translate('feedback.submitted')
                .then(Snackbar)
                .then(() => {
                  $uibModalInstance.close();
                  p.resolve();
                })
                .catch(err => p.reject(err));

            });
          } else {
            $scope.setFinished();
            p.resolve();
          }

          return p;
        });
    };

  }
);
