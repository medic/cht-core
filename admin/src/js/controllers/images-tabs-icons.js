angular.module('controllers').controller('ImagesTabsIconsCtrl',
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

        // remove configs referencing mismatched (other mime type) or missing resource icons
        Object.keys(header_tabs).forEach(tab => {
          const tabConfig = header_tabs[tab];
          if (tabConfig.resource_icon && !resourceIcons.includes(tabConfig.resource_icon)) {
            // using an empty string so the settings api overwrites the property
            tabConfig.resource_icon = '';
          }
        });
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
  });
