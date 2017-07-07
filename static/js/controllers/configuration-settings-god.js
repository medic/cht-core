angular.module('inboxControllers').controller('ConfigurationSettingsGodCtrl',
  function(
    $q,
    $log,
    $scope,
    $timeout,
    $translate,
    Settings,
    SettingsSchema
  ) {

    'use strict';
    'ngInject';

    $scope.model = {};
    $scope.schema = {};
    $scope.form = [
      '*',
      {
        type: 'submit',
        title: 'Save'
      }
    ];

    $scope.onSubmit = function(form) {
      if (form.$valid) {
        console.log('TODO: save change, data changed in $scope.model');
      } else {
        console.log('TOOD: deal with validation issues');
      }
    };

    $q.all([Settings, SettingsSchema])
      .then(function(results) {
        $scope.model = results[0];
        $scope.schema = results[1];
      })
      .catch(function(err) {
        $log.error('Error loading settings', err);
      });
  }
);
