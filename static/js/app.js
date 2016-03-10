window.PouchDB = require('pouchdb');
window.$ = window.jQuery = require('jquery');
window.d3 = require('d3');

require('../../node_modules/select2/dist/js/select2.full');
require('bootstrap');
require('./bootstrap-multidropdown');
require('bootstrap-daterangepicker');
require('bootstrap-tour');
require('nvd3');

require('angular');
require('angular-cookie');
require('angular-route');
require('angular-ui-router');
require('angular-translate');
require('angularjs-nvd3-directives');
require('angular-pouchdb');
require('angular-sanitize');
require('angular-resource');

require('moment');
require('moment/locale/es');
require('moment/locale/fr');
require('moment/locale/ne');

require('./services/index');
require('./controllers/index');
require('./filters/index');
require('./enketo/main.js');

var _ = require('underscore');
_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

(function () {

  'use strict';

  var app = angular.module('inboxApp', [
    'ipCookie',
    'ngRoute',
    'ui.router',
    'inboxFilters',
    'inboxControllers',
    'inboxServices',
    'pascalprecht.translate',
    'nvd3ChartDirectives',
    'pouchdb'
  ]);

  app.config(['$stateProvider', '$urlRouterProvider', '$translateProvider', '$compileProvider',
    function($stateProvider, $urlRouterProvider, $translateProvider, $compileProvider) {

      $urlRouterProvider.otherwise('/error/404');

      $stateProvider

        // errors
        .state('error', {
          url: '/error/:code',
          controller: 'ErrorCtrl',
          templateUrl: 'templates/partials/error.html'
        })

        // home
        .state('home', {
          url: '/home',
          controller: 'HomeCtrl'
        })

        // messages
        .state('messages', {
          url: '/messages?tour',
          controller: 'MessagesCtrl',
          templateUrl: 'templates/partials/messages.html'
        })
        .state('messages.detail', {
          url: '/:id',
          views: {
            content: {
              controller: 'MessagesContentCtrl',
              templateUrl: 'templates/partials/messages_content.html'
            }
          }
        })

        // reports
        .state('reports', {
          url: '/reports?tour&query',
          controller: 'ReportsCtrl',
          templateUrl: 'templates/partials/reports.html'
        })
        .state('reports.add', {
          url: '/add/:formId',
          views: {
            content: {
              controller: 'ReportsAddCtrl',
              templateUrl: 'templates/partials/reports_add.html'
            }
          }
        })
        .state('reports.edit', {
          url: '/edit/:reportId',
          views: {
            content: {
              controller: 'ReportsAddCtrl',
              templateUrl: 'templates/partials/reports_add.html'
            }
          }
        })
        .state('reports.detail', {
          url: '/:id',
          views: {
            content: {
              controller: 'ReportsContentCtrl',
              templateUrl: 'templates/partials/reports_content.html'
            }
          }
        })

        // analytics
        .state('analytics', {
          url: '/analytics?tour',
          controller: 'AnalyticsCtrl',
          templateUrl: 'templates/partials/analytics.html'
        })
        .state('analytics.anc', {
          url: '/anc',
          views: {
            content: {
              controller: 'AnalyticsAncCtrl',
              templateUrl: 'templates/partials/analytics/anc.html'
            }
          }
        })
        .state('analytics.stock', {
          url: '/stock',
          views: {
            content: {
              controller: 'AnalyticsStockCtrl',
              templateUrl: 'templates/partials/analytics/stock.html'
            }
          }
        })
        .state('analytics.targets', {
          url: '/targets',
          views: {
            content: {
              controller: 'AnalyticsTargetsCtrl',
              templateUrl: 'templates/partials/analytics/targets.html'
            }
          }
        })

        // contacts
        .state('contacts', {
          url: '/contacts',
          controller: 'ContactsCtrl',
          templateUrl: 'templates/partials/contacts.html'
        })
        .state('contacts.add', {
          url: '/add',
          views: {
            content: {
              controller: 'ContactsEditCtrl',
              templateUrl: 'templates/partials/contacts_edit.html'
            }
          }
        })
        .state('contacts.report', {
          url: '/:id/report/:formId',
          views: {
            content: {
              controller: 'ContactsReportCtrl',
              templateUrl: 'templates/partials/contacts_report.html'
            }
          }
        })
        .state('contacts.detail', {
          url: '/:id',
          views: {
            content: {
              controller: 'ContactsContentCtrl',
              templateUrl: 'templates/partials/contacts_content.html'
            }
          }
        })
        .state('contacts.addChild', {
          url: '/:parent_id/add/:type',
          views: {
            content: {
              controller: 'ContactsEditCtrl',
              templateUrl: 'templates/partials/contacts_edit.html'
            }
          }
        })
        .state('contacts.edit', {
          url: '/:id/edit',
          views: {
            content: {
              controller: 'ContactsEditCtrl',
              templateUrl: 'templates/partials/contacts_edit.html'
            }
          }
        })

        // tasks
        .state('tasks', {
          url: '/tasks',
          controller: 'TasksCtrl',
          templateUrl: 'templates/partials/tasks.html'
        })
        .state('tasks.detail', {
          url: '/:id',
          views: {
            content: {
              controller: 'TasksContentCtrl',
              templateUrl: 'templates/partials/tasks_content.html'
            }
          }
        })

        // configuration
        .state('configuration', {
          url: '/configuration',
          controller: 'ConfigurationCtrl',
          templateUrl: 'templates/partials/configuration.html'
        })
        .state('configuration.settings', {
          url: '/settings',
          views: {
            content: {
              templateUrl: 'templates/partials/configuration_settings.html'
            }
          }
        })
        .state('configuration.settings.basic', {
          url: '/basic',
          views: {
            tab: {
              controller: 'ConfigurationSettingsBasicCtrl',
              templateUrl: 'templates/partials/configuration_settings_basic.html'
            }
          }
        })
        .state('configuration.settings.advanced', {
          url: '/advanced',
          views: {
            tab: {
              controller: 'ConfigurationSettingsAdvancedCtrl',
              templateUrl: 'templates/partials/configuration_settings_advanced.html'
            }
          }
        })
        .state('configuration.targets', {
          url: '/targets',
          views: {
            content: {
              controller: 'ConfigurationTargetsCtrl',
              templateUrl: 'templates/partials/configuration_targets.html'
            }
          }
        })
        .state('configuration.targets-edit', {
          url: '/targets/edit/:id',
          views: {
            content: {
              controller: 'ConfigurationTargetsEditCtrl',
              templateUrl: 'templates/partials/configuration_targets_edit.html'
            }
          }
        })
        .state('configuration.translation', {
          url: '/translation',
          views: {
            content: {
              templateUrl: 'templates/partials/configuration_translation.html'
            }
          }
        })
        .state('configuration.translation.languages', {
          url: '/languages',
          views: {
            tab: {
              controller: 'ConfigurationTranslationLanguagesCtrl',
              templateUrl: 'templates/partials/configuration_translation_languages.html'
            }
          }
        })
        .state('configuration.translation.application', {
          url: '/application',
          views: {
            tab: {
              controller: 'ConfigurationTranslationApplicationCtrl',
              templateUrl: 'templates/partials/configuration_translation_application.html'
            }
          }
        })
        .state('configuration.translation.messages', {
          url: '/messages',
          views: {
            tab: {
              controller: 'ConfigurationTranslationMessagesCtrl',
              templateUrl: 'templates/partials/configuration_translation_messages.html'
            }
          }
        })
        .state('configuration.forms', {
          url: '/forms',
          views: {
            content: {
              controller: 'ConfigurationFormsCtrl',
              templateUrl: 'templates/partials/configuration_forms.html'
            }
          }
        })
        .state('configuration.user', {
          url: '/user',
          views: {
            content: {
              controller: 'ConfigurationUserCtrl',
              templateUrl: 'templates/partials/configuration_user.html'
            }
          }
        })
        .state('configuration.users', {
          url: '/users',
          views: {
            content: {
              controller: 'ConfigurationUsersCtrl',
              templateUrl: 'templates/partials/configuration_users.html'
            }
          }
        })
        .state('configuration.export', {
          url: '/export',
          views: {
            content: {
              controller: 'ConfigurationExportCtrl',
              templateUrl: 'templates/partials/configuration_export.html'
            }
          }
        })
        .state('configuration.icons', {
          url: '/icons',
          views: {
            content: {
              controller: 'ConfigurationIconsCtrl',
              templateUrl: 'templates/partials/configuration_icons.html'
            }
          }
        })
        .state('configuration.permissions', {
          url: '/permissions',
          views: {
            content: {
              controller: 'ConfigurationPermissionsCtrl',
              templateUrl: 'templates/partials/configuration_permissions.html'
            }
          }
        })

        // about page
        .state('about', {
          url: '/about',
          controller: 'AboutCtrl',
          templateUrl: 'templates/partials/about.html'
        })

        .state('help', {
          url: '/help/{page}',
          controller: 'HelpCtrl',
          templateUrl: 'templates/partials/help.html'
        })

        // theme design testing page
        .state('theme', {
          url: '/theme',
          controller: 'ThemeCtrl',
          templateUrl: 'templates/partials/theme.html'
        });

      $urlRouterProvider.when('', '/home');
      $translateProvider.useLoader('SettingsLoader', {});
      $translateProvider.useSanitizeValueStrategy('escape');
      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|sms|file|blob):/);
    }
  ]);

  app.factory('SettingsLoader', ['Settings', function (Settings) {
    return function (options) {
      return Settings().then(function(res) {
        options.key = options.key || res.locale || 'en';

        var test = false;
        if (options.key === 'test') {
          options.key = 'en';
          test = true;
        }

        var data = {};
        if (res.translations) {
          res.translations.forEach(function(translation) {
            var key = translation.key;
            var value = translation.default || key;
            translation.translations.forEach(function(val) {
              if (val.locale === options.key) {
                value = val.content;
              }
            });
            if (test) {
              value = '-' + value + '-';
            }
            data[key] = value;
          });
        }
        return data;
      });
    };
  }]);

  var getUsername = function() {
    var userCtx;
    _.forEach(document.cookie.split(';'), function(c) {
      c = c.trim().split('=', 2);
      if (c[0] === 'userCtx') {
        userCtx = c[1];
      }
    });
    if (!userCtx) {
      return;
    }
    try {
      return JSON.parse(unescape(decodeURI(userCtx))).name;
    } catch(e) {
      return;
    }
  };

  var getDbNames = function() {
    // parse the URL to determine the remote and local database names
    var url = window.location.href;
    var protocolLocation = url.indexOf('//') + 2;
    var hostLocation = url.indexOf('/', protocolLocation) + 1;
    var dbNameLocation = url.indexOf('/', hostLocation);
    return {
      remoteUrl: url.slice(0, dbNameLocation),
      remoteDbName: url.slice(hostLocation, dbNameLocation),
      local: url.slice(hostLocation, dbNameLocation) + '-user-' + getUsername()
    };
  };

  // Protractor waits for requests to complete so we have to disable
  // long polling requests.
  app.constant('E2ETESTING', window.location.href.indexOf('e2eTesting=true') !== -1);
  app.constant('CONTACT_TYPES', [ 'district_hospital', 'health_center', 'clinic', 'person' ]);
  app.constant('PLACE_TYPES', [ 'district_hospital', 'health_center', 'clinic' ]);

  var bootstrapApplication = function() {
    app.constant('APP_CONFIG', {
      name: '@@APP_CONFIG.name',
      version: '@@APP_CONFIG.version'
    });
    angular.element(document).ready(function() {
      angular.bootstrap(document, [ 'inboxApp' ]);
    });
  };

  var names = getDbNames();
  window.PouchDB(names.local)
    .get('_design/medic')
    .then(function() {
      // ddoc found - bootstrap immediately
      bootstrapApplication();
    }).catch(function() {
      window.PouchDB(names.remoteUrl)
        .get('_design/medic')
        .then(function(ddoc) {
          var minimal = _.pick(ddoc, '_id', 'app_settings', 'views');
          minimal.remote_rev = ddoc._rev;
          return window.PouchDB(names.local)
            .put(minimal);
        })
        .then(bootstrapApplication)
        .catch(function(err) {
          if (err.status === 401) {
            console.warn('User must reauthenticate');
            window.location.href = '/' + getDbNames().remoteDbName + '/login' +
            '?redirect=' + encodeURIComponent(window.location.href);
          } else {
            $('.bootstrap-layer').html('<div><p>Loading error, please check your connection.</p><a class="btn btn-primary" href="#" onclick="window.location.reload(false);">Try again</a></div>');
            console.error('Error fetching ddoc from remote server', err);
          }
        });
    });

}());
