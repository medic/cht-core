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

    $scope.submit = function() {
      $scope.setProcessing();
      var docs = $scope.model.docs;
      DeleteDocs(docs)
        .then(function() {
          var key = docs.length === 1 ? 'document.deleted' : 'document.deleted.plural';
          $translate(key, { number: docs.length }).then(Snackbar);
          $scope.setFinished();
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
