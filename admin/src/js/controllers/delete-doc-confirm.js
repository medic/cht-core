const constants = require('@medic/constants');
const DOC_TYPES = constants.DOC_TYPES;

angular.module('controllers').controller('DeleteDocConfirm',
  function (
    $scope,
    $uibModalInstance,
    DB,
    ExtractLineage
  ) {

    'use strict';
    'ngInject';

    $scope.submit = function() {
      const doc = $scope.model.doc;

      doc._deleted = true;
      if (doc.type === DOC_TYPES.DATA_RECORD && doc.contact) {
        doc.contact = ExtractLineage(doc.contact);
      }

      DB().put(doc)
        .then(function() {
          $uibModalInstance.close();
        })
        .catch(function(err) {
          $scope.setError(err, 'Error deleting document');
        });
    };

    $scope.cancel = function() {
      $uibModalInstance.dismiss();
    };

  });
