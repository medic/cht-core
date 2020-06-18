angular.module('controllers').controller('ImagesTabsCtrl',
  function(
    $log,
    $q,
    $scope,
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

    $scope.submitting = false;
    $scope.submitError = false;

    const setupPromise = $q
      .all([
        ResourceIcons.getDocResourcesByMimeType('resources', 'image/svg+xml'),
        Settings(),
      ])
      .then(([ resourceIcons = [], { header_tabs = {} } = {} ]) => {
        $scope.resourceIcons = resourceIcons;
        $scope.tabsConfig = header_tabs;
      })
      .catch(err => {
        $scope.error = true;
        $log.error('Error loading settings', err);
      })
      .finally(() => $scope.loading = false);

    $scope.submit = () => {
      $scope.submitting = true;
      return UpdateSettings({ header_tabs: $scope.tabsConfig })
        .then(() => {
          $scope.submitError = false;
          $scope.submitted = true;
        })
        .catch(err => {
          $scope.submitError = true;
          $log.error('Error updating settings', err);
        })
        .finally(() => $scope.submitting = false);
    };

    this.getSetupPromiseForTesting = () => setupPromise;
  }
);
