angular.module('controllers').controller('ExportTrainingsCtrl',
  function (
    $scope,
    Export
  ) {

    'use strict';
    'ngInject';

    $scope.export = function() {
      Export('trainings', {}, { humanReadable: true });
    };

  }
);
