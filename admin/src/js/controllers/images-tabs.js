angular.module('controllers').controller('ImagesTabsCtrl',
  function(
    $log,
    $q,
    $scope,
    $translate,
    DB,
    HeaderTabs,
    ResourceIcons,
    Settings,
    UpdateSettings
  ) {

    'ngInject';
    'use strict';

    $scope.error = null;
    $scope.loading = true;
    $scope.resourceIcons = null;
    $scope.tabs = HeaderTabs();
    $scope.tabsConfig = null;

    const setupPromise = $q
      .all([
        ResourceIcons.getDocResourcesByMimeType('resources', 'image/svg+xml'),
        Settings(),
      ])
      .then(([ resourceIcons, settings ]) => {
        $scope.resourceIcons = resourceIcons;
        $scope.tabsConfig = settings.header_tabs || {};
      })
      .catch(err => {
        $scope.error = true;
        $log.error('Error loading settings', err);
      })
      .finally(() => $scope.loading = false);

    $scope.submit = () => {
      $scope.submitting = true;
      return UpdateSettings({ header_tabs: $scope.tabsConfig })
        .catch(err => {
          $scope.error = true;
          $log.error('Error updating settings', err);
        })
        .finally(() => $scope.submitting = false);
    };

    this.getSetupPromiseForTesting = () => setupPromise;
  }
);
