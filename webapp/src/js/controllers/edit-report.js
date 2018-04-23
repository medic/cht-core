/**
 * This controller is used for editing non-enketo Reports.
 */
angular.module('inboxControllers').controller('EditReportCtrl',
  function (
    $log,
    $scope,
    $uibModalInstance,
    Select2Search,
    UpdateFacility
  ) {

    'use strict';
    'ngInject';

    $uibModalInstance.rendered.then(function() {
      Select2Search($('#edit-report [name=facility]'), 'person', {
        allowNew: false,
        initialValue: ($scope.model.report.contact &&
                       $scope.model.report.contact._id) ||
                      $scope.model.report.from
      }).catch(function(err) {
        $log.error('Error initialising select2', err);
      });
    });

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

    $scope.saveReport = function() {
      var docId = $scope.model.report._id;
      var facilityId = $('#edit-report [name=facility]').val();
      if (!docId) {
        $scope.setError(new Error('Validation error'), 'Error updating facility');
      } else if (!facilityId) {
        $scope.setError(new Error('Validation error'), 'Please select a facility');
      } else if (facilityId === $scope.model.report.from) {
        // Still showing the default phone number because there is no attached
        // contact so no save required
        $uibModalInstance.close();
      } else {
        $scope.setProcessing();
        UpdateFacility(docId, facilityId)
          .then(function() {
            $scope.setFinished();
            $uibModalInstance.close();
          })
          .catch(function(err) {
            $scope.setError(err, 'Error updating facility');
          });
      }
    };
  }
);
