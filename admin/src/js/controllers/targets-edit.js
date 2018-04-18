var _ = require('underscore');

angular.module('controllers').controller('TargetsEditCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $stateParams,
    DB,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    $scope.errors = {};
    $scope.status = null;
    $scope.target = { type: 'count' };
    $scope.locales = [];
    $scope.saving = false;
    $scope.editing = $stateParams.id;
    $scope.icons = [];

    Settings()
      .then(function(settings) {
        $scope.locales = _.map(settings.locales, _.clone);
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
      });

    DB()
      .get('resources')
      .then(function(icons) {
        $scope.icons = Object.keys(icons.resources);
      })
      .catch(function(err) {
        $log.error('Error fetching resources', err);
      });

    var removeItem = function(settings) {
      var items = settings.tasks.targets.items;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === $scope.target.id) {
          items.splice(i, 1);
        }
      }
      return $q.resolve({ tasks: { targets: { items: items } } });
    };

    $scope.delete = function() {
      if (!$stateParams.id) {
        return;
      }
      $scope.saving = true;
      Settings()
        .then(removeItem)
        .then(UpdateSettings)
        .then(function() {
          $scope.saving = false;
          $state.go('configuration.targets');
        })
        .catch(function(err) {
          $log.error('Error updating settings', err);
          $scope.saving = false;
          $scope.status = 'Save failed';
        });
    };

    var updateItem = function(settings) {
      var items = (settings.tasks && settings.tasks.targets &&
                   settings.tasks.targets.items) || [];
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
      return $q.resolve({ tasks: { targets: { items: items } } });
    };

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
          translation.content = locale.content;
        } else if (locale.content) {
          $scope.target.name.push({
            locale: locale.code,
            content: locale.content
          });
        }
      });

      Settings()
        .then(updateItem)
        .then(UpdateSettings)
        .then(function() {
          $scope.saving = false;
          $scope.status = 'Saved';
        })
        .catch(function(err) {
          $log.error('Error updating settings', err);
          $scope.saving = false;
          $scope.status = 'Save failed';
        });
    };

  }
);
