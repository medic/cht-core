angular.module('inboxControllers').controller('DeleteDocConfirm',
  function (
    $scope,
    $translate,
    $uibModalInstance,
    DB,
    ExtractLineage,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;

    ctrl.submit = function() {
      const doc = $scope.model.doc;

      doc._deleted = true;
      if (doc.type === 'data_record' && doc.contact) {
        doc.contact = ExtractLineage(doc.contact);
      }

      DB().put(doc)
        .then(function() {
          return $translate('document.deleted');
        })
        .then(Snackbar)
        .then(function() {
          $uibModalInstance.close();
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
