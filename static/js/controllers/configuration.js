(function () {

  'use strict';

  var inboxControllers = angular.module('inboxControllers');

  inboxControllers.controller('ConfigurationCtrl',
    function (
      $log,
      $scope,
      $state,
      Auth
    ) {
      'ngInject';
      $scope.configurationPages = [
        {
          state: 'configuration.settings.basic',
          icon: 'fa-wrench',
          name: 'Settings',
          idAttr: 'configuration-settings-button',
          active: function() {
            return $state.includes('configuration.settings');
          }
        },
        {
          state: 'configuration.translation.languages',
          icon: 'fa-language',
          name: 'Languages',
          idAttr: 'configuration-languages-button',
          active: function() {
            return $state.includes('configuration.translation');
          }
        },
        {
          state: 'configuration.forms',
          icon: 'fa-list-alt',
          name: 'Forms',
          idAttr: 'configuration-forms-button',
          active: function() {
            return $state.is('configuration.forms');
          }
        },
        {
          state: 'configuration.export.messages',
          icon: 'fa-exchange fa-rotate-90',
          name: 'import.export',
          idAttr: 'configuration-import-export-button',
          active: function() {
            return $state.includes('configuration.export');
          }
        },
        {
          state: 'configuration.user',
          icon: 'fa-user',
          name: 'edit.user.settings',
          idAttr: 'configuration-user-settings-button',
          active: function() {
            return $state.is('configuration.user');
          }
        },
        {
          state: 'configuration.users',
          icon: 'fa-users',
          name: 'Users',
          idAttr: 'configuration-users-button',
          active: function() {
            return $state.is('configuration.users');
          }
        },
        {
          state: 'configuration.icons',
          icon: 'fa-file-image-o',
          name: 'icons',
          idAttr: 'configuration-icons-button',
          active: function() {
            return $state.is('configuration.icons');
          }
        },
        {
          state: 'configuration.targets',
          icon: 'fa-dot-circle-o',
          name: 'analytics.targets',
          idAttr: 'configuration-targets-button',
          active: function() {
            return $state.is('configuration.targets') || $state.is('configuration.targets-edit');
          }
        },
        {
          state: 'configuration.permissions',
          icon: 'fa-key',
          name: 'configuration.permissions',
          idAttr: 'configuration-permissions-button',
          active: function() {
            return $state.is('configuration.permissions');
          }
        },
      ];

      if (!$state.is('configuration.user')) {
        Auth('can_configure').catch(function(err) {
          $log.error('Insufficient permissions. Must be either "admin" or "nationalAdmin".', err);
          $state.go('error', { code: 403 });
        });
      }
    }
  );

}());