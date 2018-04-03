angular.module('inboxControllers').controller('BulkDeleteConfirm',
  function(
    $scope,
    $timeout,
    $translate,
    $uibModalInstance,
    DeleteDocs
  ) {
    'use strict';
    'ngInject';

    $scope.totalDocsSelected = 0;
    $scope.totalDocsDeleted = 0;
    function updateTotalDocsDeleted(totalDocsDeleted) {
      $timeout(function() {
        $scope.totalDocsDeleted = totalDocsDeleted;
      });
    }

    $scope.$on('modal.closing', function() {
      if ($scope.deleteComplete) {
        return window.location.reload();
      }
    });

    $scope.submit = function() {
      if ($scope.deleteComplete) {
        return window.location.reload();
      }

      var docs = $scope.model.docs;
      $scope.totalDocsSelected = docs.length;
      $scope.totalDocsDeleted = 0;
      $scope.setProcessing();
      DeleteDocs(docs, { progress: updateTotalDocsDeleted })
        .then(function() {
          $scope.deleteComplete = true;
          $scope.setFinished();
        })
        .catch(function(err) {
          $scope.setError(err, 'Error deleting document');
        });
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };
  }
);
