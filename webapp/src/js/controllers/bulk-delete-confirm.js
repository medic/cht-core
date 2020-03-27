angular.module('inboxControllers').controller('BulkDeleteConfirm',
  function(
    $scope,
    $timeout,
    $uibModalInstance,
    $window,
    DeleteDocs
  ) {
    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.totalDocsSelected = 0;
    ctrl.totalDocsDeleted = 0;
    function updateTotalDocsDeleted(totalDocsDeleted) {
      $timeout(function() {
        ctrl.totalDocsDeleted = totalDocsDeleted;
      });
    }

    $scope.$on('modal.closing', function() {
      if (ctrl.deleteComplete) {
        return $window.location.reload();
      }
    });

    ctrl.submit = function() {
      if (ctrl.deleteComplete) {
        return $window.location.reload();
      }

      const docs = $scope.model.docs;
      ctrl.totalDocsSelected = docs.length;
      ctrl.totalDocsDeleted = 0;
      $scope.setProcessing();
      DeleteDocs(docs, { progress: updateTotalDocsDeleted })
        .then(function() {
          ctrl.deleteComplete = true;
          $scope.setFinished();
        })
        .catch(function(err) {
          $scope.setError(err, 'Error deleting document');
        });
    };

    ctrl.cancel = function() {
      $uibModalInstance.dismiss();
    };
  }
);
