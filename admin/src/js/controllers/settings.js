angular.module('controllers').controller('SettingsCtrl',
  function (
    $log,
    $scope,
    $timeout,
    $translate,
    Languages,
    Settings,
    UpdateSettings
  ) {

    'use strict';
    'ngInject';

    $scope.submitBasicSettings = function() {
      $scope.status = { loading: true };
      var settings = {
        locale: $scope.basicSettingsModel.locale,
        locale_outgoing: $scope.basicSettingsModel.locale_outgoing
      };
      UpdateSettings(settings)
        .then(function() {
          $scope.status = { success: true, msg: $translate.instant('Saved') };
          $timeout(function() {
            if ($scope.status) {
              $scope.status.success = false;
            }
          }, 3000);
        })
        .catch(function(err) {
          $log.error('Error updating settings', err);
          $scope.status = { error: true, msg: $translate.instant('Error saving settings') };
        });
    };

    Languages().then(function(languages) {
      $scope.enabledLocales = languages;
    });

    Settings()
      .then(function(res) {
        $scope.basicSettingsModel = {
          locale: res.locale,
          locale_outgoing: res.locale_outgoing
        };
      })
      .catch(function(err) {
        $log.error('Error loading settings', err);
      });

  }
);
