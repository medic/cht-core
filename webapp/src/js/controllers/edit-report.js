/**
 * This controller is used for editing non-enketo Reports.
 */
angular.module('inboxControllers').controller('EditReportCtrl',
  function (
    $log,
    $scope,
    $uibModalInstance,
    ContactTypes,
    Select2Search,
    UpdateFacility
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    $uibModalInstance.rendered
      .then(() => ContactTypes.getPersonTypes())
      .then(types => {
        types = types.map(type => type.id);
        const options = {
          allowNew: false,
          initialValue: ($scope.model.report.contact && $scope.model.report.contact._id) ||
                        $scope.model.report.from
        };
        return Select2Search($('#edit-report [name=facility]'), types, options);
      })
      .catch(err => $log.error('Error initialising select2', err));

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };

    ctrl.saveReport = function() {
      const docId = $scope.model.report._id;
      const facilityId = $('#edit-report [name=facility]').val();
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
