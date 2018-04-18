window.PouchDB = require('pouchdb-browser');
window.$ = window.jQuery = require('jquery');
require('../../node_modules/select2/dist/js/select2.full');

require('bootstrap');
require('angular');
require('angular-pouchdb');
require('angular-route');
require('angular-sanitize');
require('angular-translate');
require('angular-translate-interpolation-messageformat');
require('angular-ui-bootstrap');
require('angular-ui-router');

angular.module('controllers', []);
require('./controllers/main');
require('./controllers/edit-language');
require('./controllers/edit-translation');
require('./controllers/export-audit-logs');
require('./controllers/export-contacts');
require('./controllers/export-feedback');
require('./controllers/export-messages');
require('./controllers/export-reports');
require('./controllers/export-server-logs');
require('./controllers/forms-json');
require('./controllers/forms-xml');
require('./controllers/icons');
require('./controllers/import-translation');
require('./controllers/permissions');
require('./controllers/settings-advanced');
require('./controllers/settings-basic');
require('./controllers/targets');
require('./controllers/targets-edit');
require('./controllers/translation-application');
require('./controllers/translation-languages');
require('./controllers/upgrade');
require('./controllers/upgrade-confirm');

angular.module('directives', []);
require('./directives/modal');

angular.module('filters', []);
require('./filters/resource-icon');
require('./filters/translate-from');

angular.module('services', []);
require('./services/add-attachment');
require('./services/db');
require('./services/download-url');
require('./services/export');
require('./services/file-reader');
require('./services/json-parse');
require('./services/languages');
require('./services/modal');
require('./services/properties');
require('./services/resource-icons');
require('./services/settings');
require('./services/translate');
require('./services/translate-from');
require('./services/translation-loader');
require('./services/update-settings');
require('./services/version');

var app = angular.module('adminApp', [
  'controllers',
  'directives',
  'filters',
  'ngRoute',
  'pascalprecht.translate',
  'pouchdb',
  'services',
  'ui.bootstrap',
  'ui.router',
]);

app.config(function($stateProvider, $translateProvider) {
  'ngInject';

  $translateProvider.useLoader('TranslationLoader', {});
  $translateProvider.useSanitizeValueStrategy('escape');
  $translateProvider.addInterpolation('$translateMessageFormatInterpolation');

  $stateProvider
    .state('settings', {
      url: '/settings',
      templateUrl: 'templates/settings.html'
    })
    .state('settings.basic', {
      url: '/basic',
      views: {
        tab: {
          controller: 'SettingsBasicCtrl',
          templateUrl: 'templates/settings_basic.html'
        }
      }
    })
    .state('settings.advanced', {
      url: '/advanced',
      views: {
        tab: {
          controller: 'SettingsAdvancedCtrl',
          templateUrl: 'templates/settings_advanced.html'
        }
      }
    })
    .state('export', {
      url: '/export',
      templateUrl: 'templates/export.html'
    })
    .state('export.messages', {
      url: '/messages',
      views: {
        tab: {
          controller: 'ExportMessagesCtrl',
          templateUrl: 'templates/export_messages.html'
        }
      }
    })
    .state('export.reports', {
      url: '/reports',
      views: {
        tab: {
          controller: 'ExportReportsCtrl',
          templateUrl: 'templates/export_reports.html'
        }
      }
    })
    .state('export.contacts', {
      url: '/contacts',
      views: {
        tab: {
          controller: 'ExportContactsCtrl',
          templateUrl: 'templates/export_contacts.html'
        }
      }
    })
    .state('export.feedback', {
      url: '/feedback',
      views: {
        tab: {
          controller: 'ExportFeedbackCtrl',
          templateUrl: 'templates/export_feedback.html'
        }
      }
    })
    .state('export.serverlogs', {
      url: '/server-logs',
      views: {
        tab: {
          controller: 'ExportServerLogsCtrl',
          templateUrl: 'templates/export_server_logs.html'
        }
      }
    })
    .state('export.auditlogs', {
      url: '/audit-logs',
      views: {
        tab: {
          controller: 'ExportAuditLogsCtrl',
          templateUrl: 'templates/export_audit_logs.html'
        }
      }
    })
    .state('forms', {
      url: '/forms',
      templateUrl: 'templates/forms.html'
    })
    .state('forms.json', {
      url: '/json',
      views: {
        tab: {
          controller: 'FormsJsonCtrl',
          templateUrl: 'templates/forms_json.html'
        }
      }
    })
    .state('forms.xml', {
      url: '/xml',
      views: {
        tab: {
          controller: 'FormsXmlCtrl',
          templateUrl: 'templates/forms_xml.html'
        }
      }
    })
    .state('icons', {
      url: '/icons',
      controller: 'IconsCtrl',
      templateUrl: 'templates/icons.html'
    })
    .state('permissions', {
      url: '/permissions',
      controller: 'PermissionsCtrl',
      templateUrl: 'templates/permissions.html'
    })
    .state('targets', {
      url: '/targets',
      controller: 'TargetsCtrl',
      templateUrl: 'templates/targets.html'
    })
    .state('targets-edit', {
      url: '/targets/edit/:id',
      controller: 'TargetsEditCtrl',
      templateUrl: 'templates/targets_edit.html'
    })
    .state('translation', {
      url: '/translation',
      templateUrl: 'templates/translation.html'
    })
    .state('translation.languages', {
      url: '/languages',
      views: {
        tab: {
          controller: 'TranslationLanguagesCtrl',
          templateUrl: 'templates/translation_languages.html'
        }
      }
    })
    .state('translation.application', {
      url: '/application',
      views: {
        tab: {
          controller: 'TranslationApplicationCtrl',
          templateUrl: 'templates/translation_application.html'
        }
      }
    })
    .state('upgrade', {
      url: '/upgrade',
      controller: 'UpgradeCtrl',
      templateUrl: 'templates/upgrade.html'
    });
});

angular.element(document).ready(function() {
  angular.bootstrap(document, [ 'adminApp' ], {
    strictDi: true
  });
});
