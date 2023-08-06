const _ = require('lodash/core');

angular.module('controllers').controller('TargetsEditCtrl',
  function (
    $log,
    $q,
    $scope,
    $state,
    $stateParams,
    $translate,
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
    $scope.names = [];

    Settings()
      .then(function(settings) {
        $scope.locales = _.map(settings.locales, _.clone);
        if ($stateParams.id) {
          $scope.target = _.find(settings.tasks.targets.items, { id: $stateParams.id });
          if (typeof $scope.target.name === 'undefined') {
            $scope.names = $scope.locales.map(locale => {
              const translation = $translate.instant(
                $scope.target.translation_key, null, 'no-interpolation', locale.code, null
              );
              const content  = translation === $scope.target.translation_key ? '' : translation;
              return {
                locale,
                content
              };
            });
          } else {
            $scope.names = $scope.locales.map(locale => {
              const name = $scope.target.name.find(item => item.locale === locale.code);
              const content = name ? name.content : '';
              return {
                locale,
                content
              };
            });
          }
        } else {
          $scope.names = $scope.locales.map(locale => ({ locale }));
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

    const removeItem = function(settings) {
      const items = settings.tasks.targets.items;
      for (let i = 0; i < items.length; i++) {
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

    const targetExists = (settings) => {
      if ($scope.editing) {
        // The ID has been set to read-only
        return false;
      }
      const  items = (settings.tasks && settings.tasks.targets &&
        settings.tasks.targets.items) || [];
      const exists = items.some(item => item.id === $scope.target.id);
      return exists;
    };

    const updateItem = function(settings) {
      const items = (settings.tasks && settings.tasks.targets &&
                   settings.tasks.targets.items) || [];
      if ($stateParams.id) {
        // updating
        for (let i = 0; i < items.length; i++) {
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

      return Settings()
        .then(settings => {
          if (targetExists(settings)) {
            $scope.errors.id = 'analytics.targets.unique.id';
            $scope.status = 'Failed validation';
            $scope.saving = false;
            return;
          }
          return updateItem(settings)
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
        });
    };

  });
