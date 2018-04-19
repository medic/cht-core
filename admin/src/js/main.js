window.PouchDB = require('pouchdb-browser');
window.$ = window.jQuery = require('jquery');
require('../../node_modules/select2/dist/js/select2.full');

require('bootstrap');
require('angular');
require('angular-cookie');
require('angular-pouchdb');
require('angular-route');
require('angular-sanitize');
require('angular-translate');
require('angular-translate-interpolation-messageformat');
require('angular-ui-bootstrap');
require('angular-ui-router');

angular.module('controllers', []);
require('./controllers/main');
require('./controllers/delete-user');
require('./controllers/edit-language');
require('./controllers/edit-translation');
require('./controllers/edit-user');
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
require('./controllers/users');

angular.module('directives', []);
require('./directives/modal');

angular.module('filters', []);
require('./filters/resource-icon');
require('./filters/translate-from');

angular.module('services', []);
require('./services/create-user');
require('./services/delete-user');
require('./services/properties');
require('./services/version');

// services we borrow from webapp
angular.module('inboxServices', []);
require('../../../static/js/services/add-attachment');
require('../../../static/js/services/auth');
require('../../../static/js/services/cache');
require('../../../static/js/services/changes');
require('../../../static/js/services/contact-schema');
require('../../../static/js/services/db');
require('../../../static/js/services/download-url');
require('../../../static/js/services/export');
require('../../../static/js/services/file-reader');
require('../../../static/js/services/get-data-records');
require('../../../static/js/services/get-subject-summaries');
require('../../../static/js/services/hydrate-contact-names');
require('../../../static/js/services/json-parse');
require('../../../static/js/services/languages');
require('../../../static/js/services/lineage-model-generator');
require('../../../static/js/services/location');
require('../../../static/js/services/modal');
require('../../../static/js/services/resource-icons');
require('../../../static/js/services/search');
require('../../../static/js/services/select2-search');
require('../../../static/js/services/settings');
require('../../../static/js/services/session');
require('../../../static/js/services/translate');
require('../../../static/js/services/translate-from');
require('../../../static/js/services/translation-loader');
require('../../../static/js/services/update-settings');
require('../../../static/js/services/update-user');

var app = angular.module('adminApp', [
  'controllers',
  'directives',
  'filters',
  'inboxServices',
  'ipCookie',
  'ngRoute',
  'pascalprecht.translate',
  'pouchdb',
  'services',
  'ui.bootstrap',
  'ui.router',
]);

app.constant('POUCHDB_OPTIONS', {
  local: { auto_compaction: true },
  remote: { skip_setup: true, ajax: { timeout: 30000 }}
});

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
    .state('users', {
      url: '/users',
      controller: 'UsersCtrl',
      templateUrl: 'templates/users.html'
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
