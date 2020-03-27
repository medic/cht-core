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
    ctrl.model = {};
    ctrl.error = {};

    const validateMessage = function(message) {
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

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };

    ctrl.submit = function() {
      $scope.setProcessing();

      const message = ctrl.model.message && ctrl.model.message.trim();
      return validateMessage(message)
        .then(function() {
          if (ctrl.error.message) {
            $scope.setFinished();
            return $q.resolve();
          }

          return Feedback.submit(message, true)
            .then(() => {
              $scope.setFinished();
              $uibModalInstance.close();
              return $translate('feedback.submitted')
                .catch(() => 'feedback.submitted') // translation not found
                .then(Snackbar);
            })
            .catch(err => $scope.setError(err, 'Error saving feedback'));
        });
    };

  }
);
