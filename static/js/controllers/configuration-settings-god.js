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

    $scope.schema = {
      type: "object",
      properties: {
        name: {
          type: "string",
          minLength: 2,
          title: "Name",
          description: "Name or alias"
        },
        title: {
          type: "string",
          enum: ['dr', 'jr', 'sir', 'mrs', 'mr', 'NaN', 'dj']
        }
      }
    };

    $scope.form = [
      "*", {
        type: "submit",
        title: "Save"
      }
    ];

    $scope.model = {};

    $scope.save = function() {
      console.log('We got save!');
    };

    $scope.submit = function() {
      console.log('We got submit!');
    };

    /*    $q.all(Settings, SettingsSchema)
          .then(function(results) {
             $scope.model = results[0];
             $scope.schema = results[1];
          })
          .catch(function(err) {
            $log.error('Error loading settings', err);
          });
    */
  }
);
