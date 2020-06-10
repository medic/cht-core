/**
 * This controller is used for editing non-enketo Trainings.
 */

/* 
angular.module('inboxControllers').controller('EditTrainingCtrl',
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
          initialValue: ($scope.model.training.contact && $scope.model.training.contact._id) ||
                        $scope.model.training.from
        };
        return Select2Search($('#edit-training [name=facility]'), types, options);
      })
      .catch(err => $log.error('Error initialising select2', err));

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };

    ctrl.saveTraining = function() {
      const docId = $scope.model.training._id;
      const facilityId = $('#edit-training [name=facility]').val();
      if (!docId) {
        $scope.setError(new Error('Validation error'), 'Error updating facility');
      } else if (!facilityId) {
        $scope.setError(new Error('Validation error'), 'Please select a facility');
      } else if (facilityId === $scope.model.training.from) {
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
 */ 
