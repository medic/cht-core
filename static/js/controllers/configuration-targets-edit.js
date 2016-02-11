(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationTargetsEditCtrl',
    ['$scope', '$stateParams', '$log', 'Settings', 'UpdateSettings',
    function ($scope, $stateParams, $log, Settings, UpdateSettings) {

      $scope.errors = {};
      $scope.status = null;
      $scope.target = {};
      $scope.locales = [];
      $scope.saving = false;

      Settings()
        .then(function(settings) {
          $scope.locales = settings.locales;
          if ($stateParams.id) {
            $scope.target = _.findWhere(settings.tasks.targets.items, { id: $stateParams.id });
            $scope.target.name.forEach(function(name) {
              var locale = _.findWhere($scope.locales, { code: name.locale });
              if (locale) {
                locale.content = name.content;
              }
            });
          }
        })
        .catch(function(err) {
          $log.error('Error fetching target', err);
        })

      $scope.submit = function() {

        $scope.errors = {};

        if (!$scope.target.id) {
          $scope.errors.id = 'validate.required';
        }
        if (!$scope.target.goal) {
          $scope.errors.goal = 'validate.required';
        } else {
          $scope.target.goal = parseInt($scope.target.goal, 10);
        }

        if (Object.keys($scope.errors).length) {
          $scope.status = 'Failed validation';
          return;
        }

        $scope.saving = true;
        $scope.status = 'Submitting';

        if (!$scope.target.name) {
          $scope.target.name = [];
        }

        $scope.locales.forEach(function(locale) {
          var translation = _.findWhere($scope.target.name, { locale: locale.code });
          if (translation) {
            translation.content = locale.content
          } else if (locale.content) {
            $scope.target.name.push({
              locale: locale.code,
              content: locale.content
            });
          }
        });

        Settings()
          .then(function(settings) {
            var items = settings.tasks.targets.items;
            if ($stateParams.id) {
              // updating
              for (var i = 0; i < items.length; i++) {
                if (items[i].id === $scope.target.id) {
                  items[i] = $scope.target;
                }
              }
            } else {
              // adding
              items.push($scope.target);
            }
            var updates = { tasks: { targets: { items: items } } };
            UpdateSettings(updates, function(err) {
              if (err) {
                $log.error('Error updating settings', err);
                $scope.status = 'Save failed';
              } else {
                $scope.status = 'Saved';
              }
            });
          })
          .catch(function(err) {
            $log.error('Error fetching settings', err);
            $scope.status = 'error.settings.loading';
          });
      };

    }
  ]);

}());