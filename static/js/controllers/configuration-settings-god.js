angular.module('inboxControllers').controller('ConfigurationSettingsGodCtrl',
  function (
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

    $scope.form = [
      '*',
      { // TODO: translation
        type: 'submit',
        title: 'Save'
      }
    ];
    $scope.model = {};
    $scope.form = {
      type: 'object',
      title: 'Comment',
      properties: {
        name: {
          title: 'Name',
          type: 'string'
        },
        email: {
          title: 'Email',
          type: 'string',
          pattern: '^\\S+@\\S+$',
          description: 'Email will be used for evil.'
        },
        comment: {
          title: 'Comment',
          type: 'string',
          maxLength: 20,
          validationMessage: 'Don\'t be greedy!'
        }
      },
      required: [
        'name',
        'email',
        'comment'
      ]
    };

    $scope.save = function() {
      console.log('We got save!');
    };

    $scope.submit = function() {
      console.log('We got submit!');
    };

    $q.all(Settings, SettingsSchema)
      .then(function(results) {
        // $scope.model = results[0];
        // $scope.schema = results[1];
      })
      .catch(function(err) {
        $log.error('Error loading settings', err);
      });

  }
);
