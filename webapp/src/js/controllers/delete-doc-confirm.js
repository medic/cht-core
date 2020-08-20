const lineageFactory = require('@medic/lineage');

angular.module('inboxControllers').controller('DeleteDocConfirm',
  function (
    $q,
    $scope,
    $translate,
    $uibModalInstance,
    DB,
    Snackbar
  ) {

    'use strict';
    'ngInject';

    const ctrl = this;
    const lineage = lineageFactory($q, DB());

    ctrl.submit = function() {
      const doc = $scope.model.doc;

      doc._deleted = true;
      lineage.minify(doc);

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
