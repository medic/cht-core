angular.module('inboxControllers').controller('FeedbackCtrl',
  function (
    $q,
    $scope,
    $translate,
    $uibModalInstance,
    Feedback,
    Snackbar,
    Translate
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    $scope.model = {};
    ctrl.error = {};

    var validateMessage = function(message) {
      if (message) {
        ctrl.error.message = false;
        return $q.resolve();
      } else {
        return Translate.fieldIsRequired('Bug description')
          .then(function(error) {
            ctrl.error.message = error;
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
          if (ctrl.error.message) {
            $scope.setFinished();
            return $q.resolve();
          }

          return $q((resolve, reject) => {
            Feedback.submit(message, true, function(err) {
              if (err) {
                return reject(err);
              }
              return resolve();
            });
          })
            .then(() => {
              $scope.setFinished();
              $uibModalInstance.close();
              return $translate('feedback.submitted')
                .catch(() => 'feedback.submitted') // translation not found
                .then(Snackbar);
            })
            .catch(err => {
              $scope.setError(err, 'Error saving feedback');
              throw err;
            });
        });
    };

  }
);
