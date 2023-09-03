window.PouchDB = require('pouchdb-browser');
window.$ = window.jQuery = require('jquery');
require('../../node_modules/select2/dist/js/select2.full')(window.jQuery);

require('bootstrap');
require('angular');
require('angular-cookie');
require('angular-pouchdb');
require('angular-route');
require('angular-sanitize');
require('angular-translate');
require('angular-translate-interpolation-messageformat');
require('angular-ui-bootstrap');
require('@uirouter/angularjs');

require('ng-redux');

const _ = require('lodash/core');
_.uniq = require('lodash/uniq');
_.groupBy = require('lodash/groupBy');
_.uniqBy = require('lodash/uniqBy');
_.findIndex = require('lodash/findIndex');
_.minBy = require('lodash/minBy');
_.partial = require('lodash/partial');
_.partial.placeholder = _;
_.range = require('lodash/range');
_.intersection = require('lodash/intersection');
_.toPairs = require('lodash/toPairs');
_.difference = require('lodash/difference');
_.template = require('lodash/template');
_.templateSettings = require('lodash/templateSettings');
_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;

angular.module('controllers', []);
require('./controllers/main');
require('./controllers/authorization-permissions');
require('./controllers/authorization-roles');
require('./controllers/delete-doc-confirm');
require('./controllers/delete-user');
require('./controllers/display-date-time');
require('./controllers/display-languages');
require('./controllers/display-privacy-policies');
require('./controllers/display-privacy-policies-preview');
require('./controllers/display-translations');
require('./controllers/edit-language');
require('./controllers/edit-translation');
require('./controllers/edit-user');
require('./controllers/export-contacts');
require('./controllers/export-dhis');
require('./controllers/export-feedback');
require('./controllers/export-messages');
require('./controllers/export-reports');
require('./controllers/forms-xml');
require('./controllers/icons');
require('./controllers/images-branding');
require('./controllers/images-partners');
require('./controllers/images-tabs-icons');
require('./controllers/import-translation');
require('./controllers/message-queue');
require('./controllers/sms-forms');
require('./controllers/sms-settings');
require('./controllers/sms-test');
require('./controllers/backup');
require('./controllers/targets');
require('./controllers/targets-edit');
require('./controllers/upgrade');
require('./controllers/upgrade-confirm');
require('./controllers/users');
require('./controllers/multiple-user');

angular.module('directives', ['ngSanitize']);
require('./directives/file-model');
require('./directives/modal');
require('./directives/pagination');
require('./directives/relative-date');
require('./directives/release');

angular.module('inboxDirectives', []);
require('./directives/auth');

angular.module('filters', ['ngSanitize']);
require('./filters/translate-from');
require('./filters/build-version');

angular.module('inboxFilters', []);
require('./filters/resource-icon');

angular.module('services', []);
require('./services/blob');
require('./services/clean-etag');
require('./services/create-user');
require('./services/delete-user');
require('./services/import-contacts');
require('./services/message-queue');
require('./services/properties');
require('./services/version');

angular.module('inboxServices', []);
require('./services/add-attachment');
require('./services/auth');
require('./services/cache');
require('./services/changes');
require('./services/contact-muted');
require('./services/contact-types');
require('./services/db');
require('./services/export');
require('./services/extract-lineage');
require('./services/file-reader');
require('./services/format-date');
require('./services/get-data-records');
require('./services/get-subject-summaries');
require('./services/get-summaries');
require('./services/header-tabs');
require('./services/hydrate-contact-names');
require('./services/json-parse');
require('./services/language');
require('./services/languages');
require('./services/lineage-model-generator');
require('./services/location');
require('./services/modal');
require('./services/moment-locale-data');
require('./services/privacy-policies');
require('./services/resource-icons');
require('./services/search');
require('./services/select2-search');
require('./services/settings');
require('./services/session');
require('./services/translate');
require('./services/translate-from');
require('./services/translation-loader');
require('./services/translation-null-interpolation');
require('./services/update-settings');
require('./services/update-user');
require('./services/user');
require('./services/validate-form');
require('./actions');
require('./selectors');
require('./reducers');

angular.module('adminApp', [
  'ngRoute',
  'controllers',
  'directives',
  'filters',
  'inboxDirectives',
  'inboxFilters',
  'inboxServices',
  'ipCookie',
  'ngRedux',
  'pascalprecht.translate',
  'pouchdb',
  'services',
  'ui.bootstrap',
  'ui.router',
]);

angular.module('adminApp').constant('POUCHDB_OPTIONS', {
  local: { auto_compaction: true },
  remote: {
    skip_setup: true,
    fetch: function(url, opts) {
      opts.headers.set('Accept', 'application/json');
      opts.credentials = 'same-origin';
      return window.PouchDB.fetch(url, opts);
    }
  }
});

angular.module('adminApp').config(function(
  $compileProvider,
  $locationProvider,
  $httpProvider,
  $ngReduxProvider,
  $stateProvider,
  $translateProvider,
  RootReducer
) {
  'ngInject';

  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|sms|file|blob):/);

  $locationProvider.hashPrefix('');

  $translateProvider.useLoader('TranslationLoader', {});
  $translateProvider.useSanitizeValueStrategy('escape');
  $translateProvider.addInterpolation('$translateMessageFormatInterpolation');
  $translateProvider.addInterpolation('TranslationNullInterpolation');

  $ngReduxProvider.createStoreWith(RootReducer, []);
  $httpProvider.defaults.headers.common.Accept = 'application/json';

  $stateProvider
    .state('display', {
      url: '/display',
      templateUrl: 'templates/display.html'
    })
    .state('display.date-time', {
      url: '/date-time',
      views: {
        tab: {
          controller: 'DisplayDateTimeCtrl',
          templateUrl: 'templates/display_date_time.html'
        }
      }
    })
    .state('display.languages', {
      url: '/languages',
      views: {
        tab: {
          controller: 'DisplayLanguagesCtrl',
          templateUrl: 'templates/display_languages.html'
        }
      }
    })
    .state('display.privacy-policies', {
      url: '/privacy-policies',
      views: {
        tab: {
          controller: 'DisplayPrivacyPoliciesCtrl',
          templateUrl: 'templates/display_privacy_policies.html'
        }
      }
    })
    .state('display.translations', {
      url: '/translations',
      views: {
        tab: {
          controller: 'DisplayTranslationsCtrl',
          templateUrl: 'templates/display_translations.html'
        }
      }
    })
    .state('backup', {
      url: '/backup',
      controller: 'BackupCtrl',
      templateUrl: 'templates/backup.html'
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
    .state('export.dhis', {
      url: '/dhis',
      views: {
        tab: {
          controller: 'ExportDhisCtrl',
          templateUrl: 'templates/export_dhis.html'
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
    .state('forms', {
      url: '/forms',
      controller: 'FormsXmlCtrl',
      templateUrl: 'templates/forms_xml.html'
    })
    .state('sms', {
      url: '/sms',
      templateUrl: 'templates/sms.html'
    })
    .state('sms.settings', {
      url: '/settings',
      views: {
        tab: {
          controller: 'SmsSettingsCtrl',
          templateUrl: 'templates/sms_settings.html'
        }
      }
    })
    .state('sms.forms', {
      url: '/forms',
      views: {
        tab: {
          controller: 'SmsFormsCtrl',
          templateUrl: 'templates/sms_forms.html'
        }
      }
    })
    .state('sms.test', {
      url: '/test',
      views: {
        tab: {
          controller: 'SmsTestCtrl',
          templateUrl: 'templates/sms_test.html'
        }
      }
    })
    .state('images', {
      url: '/images',
      templateUrl: 'templates/images.html'
    })
    .state('images.icons', {
      url: '/icons',
      views: {
        tab: {
          controller: 'IconsCtrl',
          templateUrl: 'templates/images_icons.html'
        }
      }
    })
    .state('images.branding', {
      url: '/branding',
      views: {
        tab: {
          controller: 'ImagesBrandingCtrl',
          templateUrl: 'templates/images_branding.html'
        }
      }
    })
    .state('images.partners', {
      url: '/partners',
      views: {
        tab: {
          controller: 'ImagesPartnersCtrl',
          templateUrl: 'templates/images_partners.html'
        }
      }
    })
    .state('images.tabs-icons', {
      url: '/tabs-icons',
      views: {
        tab: {
          controller: 'ImagesTabsIconsCtrl',
          templateUrl: 'templates/images_tabs_icons.html'
        }
      }
    })
    .state('authorization', {
      url: '/authorization',
      templateUrl: 'templates/authorization.html'
    })
    .state('authorization.permissions', {
      url: '/permissions',
      views: {
        tab: {
          controller: 'AuthorizationPermissionsCtrl',
          templateUrl: 'templates/authorization_permissions.html'
        }
      }
    })
    .state('authorization.roles', {
      url: '/roles',
      views: {
        tab: {
          controller: 'AuthorizationRolesCtrl',
          templateUrl: 'templates/authorization_roles.html'
        }
      }
    })
    .state('targets', {
      url: '/targets',
      controller: 'TargetsCtrl',
      templateUrl: 'templates/targets.html'
    })
    .state('targets-edit', {
      url: '/targets/edit/:id',
      controller: 'TargetsEditCtrl',
      templateUrl: 'templates/targets_edit.html',
      params: {
        id: null
      },
    })
    .state('upgrade', {
      url: '/upgrade',
      controller: 'UpgradeCtrl',
      templateUrl: 'templates/upgrade.html',
      params: {
        upgraded: null
      }
    })
    .state('message-queue', {
      url: '/message-queue',
      templateUrl: 'templates/message_queue.html',
    })
    .state('message-queue.scheduled', {
      url: '/scheduled?page',
      data: {
        tab: 'scheduled'
      },
      views: {
        tab: {
          controller: 'MessageQueueCtrl',
          templateUrl: 'templates/message_queue_tab.html'
        }
      }
    })
    .state('message-queue.due', {
      url: '/due?page',
      data: {
        tab: 'due'
      },
      views: {
        tab: {
          controller: 'MessageQueueCtrl',
          templateUrl: 'templates/message_queue_tab.html'
        }
      }
    })
    .state('message-queue.muted-future', {
      url: '/will-not-send?page',
      data: {
        tab: 'muted',
        descending: false
      },
      views: {
        tab: {
          controller: 'MessageQueueCtrl',
          templateUrl: 'templates/message_queue_tab.html'
        }
      }
    })
    .state('message-queue.muted-past', {
      url: '/did-not-send?page',
      data: {
        tab: 'muted',
        descending: true
      },
      views: {
        tab: {
          controller: 'MessageQueueCtrl',
          templateUrl: 'templates/message_queue_tab.html'
        }
      }
    });
});

angular.element(document).ready(function() {
  angular.bootstrap(document, [ 'adminApp' ], {
    strictDi: true
  });
});
