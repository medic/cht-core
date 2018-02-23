angular.module('inboxControllers').controller('DeleteDocConfirm',
  function(
    $scope,
    $translate,
    $uibModalInstance,
    DeleteDocs,
    Snackbar
  ) {
    'use strict';
    'ngInject';

    $scope.totalDocsSelected = 0;
    $scope.totalDocsDeleted = 0;
    function updateTotalDocsDeleted(totalDocsDeleted) {
      $scope.totalDocsDeleted = totalDocsDeleted;
    }

    $scope.submit = function() {
      var docs = $scope.model.docs;
      $scope.totalDocsSelected = docs.length;
      $scope.totalDocsDeleted = 0;
      $scope.setProcessing();
      DeleteDocs(docs, { progress: updateTotalDocsDeleted })
        .then(function() {
          $scope.setFinished();
          var key = docs.length === 1 ? 'document.deleted' : 'document.deleted.plural';
          $translate(key, { number: docs.length }).then(Snackbar);
          $uibModalInstance.close();
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
