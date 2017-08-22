angular.module('inboxControllers').controller('ConfigurationCtrl',
  function (
    $log,
    $scope,
    $state,
    Auth
  ) {
    'use strict';
    'ngInject';
    $scope.configurationPages = [
      {
        state: 'configuration.settings.basic',
        icon: 'fa-wrench',
        name: 'Settings',
        active: function() {
          return $state.includes('configuration.settings');
        }
      },
      {
        state: 'configuration.translation.languages',
        icon: 'fa-language',
        name: 'Languages',
        active: function() {
          return $state.includes('configuration.translation');
        }
      },
      {
        state: 'configuration.forms.xml',
        icon: 'fa-list-alt',
        name: 'Forms',
        active: function() {
          return $state.includes('configuration.forms');
        }
      },
      {
        state: 'configuration.export.messages',
        icon: 'fa-exchange fa-rotate-90',
        name: 'import.export',
        active: function() {
          return $state.includes('configuration.export');
        }
      },
      {
        state: 'configuration.upgrade',
        icon: 'fa-rocket',
        name: 'instance.upgrade',
        active: function() {
          return $state.is('configuration.upgrade');
        }
      },
      {
        state: 'configuration.user',
        icon: 'fa-user',
        name: 'edit.user.settings',
        active: function() {
          return $state.is('configuration.user');
        }
      },
      {
        state: 'configuration.users',
        icon: 'fa-users',
        name: 'Users',
        active: function() {
          return $state.is('configuration.users');
        }
      },
      {
        state: 'configuration.icons',
        icon: 'fa-file-image-o',
        name: 'icons',
        active: function() {
          return $state.is('configuration.icons');
        }
      },
      {
        state: 'configuration.targets',
        icon: 'fa-dot-circle-o',
        name: 'analytics.targets',
        active: function() {
          return $state.is('configuration.targets') || $state.is('configuration.targets-edit');
        }
      },
      {
        state: 'configuration.permissions',
        icon: 'fa-key',
        name: 'configuration.permissions',
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
