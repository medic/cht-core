angular.module('controllers').controller('DeleteDocConfirm',
  function (
    $rootScope,
    $scope,
    $translate,
    $uibModalInstance,
    DB,
    ExtractLineage
  ) {

    'use strict';
    'ngInject';

    $scope.submit = function() {
      var doc = $scope.model.doc;

      doc._deleted = true;
      if (doc.type === 'data_record' && doc.contact) {
        doc.contact = ExtractLineage(doc.contact);
      }

      DB().put(doc)
        .then(function() {
          $uibModalInstance.close();
          $rootScope.$broadcast('LanguagesUpdated');
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
