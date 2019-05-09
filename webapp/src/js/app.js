// While we already do this earlier in inbox.js we have to check again for Karma
// tests as they don't hit that code
if (!window.startupTimes) {
  window.startupTimes = {};
}
window.startupTimes.firstCodeExecution = performance.now();

window.PouchDB = require('pouchdb-browser');
window.PouchDB.plugin(require('pouchdb-debug'));
window.$ = window.jQuery = require('jquery');
window.d3 = require('d3');

require('../../node_modules/select2/dist/js/select2.full');
require('bootstrap');
require('./bootstrap-multidropdown');
require('bootstrap-daterangepicker');
require('nvd3');

require('angular');
require('angular-cookie');
require('angular-nvd3');
require('angular-pouchdb');
require('angular-resource');
require('angular-route');
require('angular-sanitize');
require('angular-translate');
require('angular-translate-interpolation-messageformat');
require('angular-translate-handler-log');
require('angular-ui-bootstrap');
const uiRouter = require('@uirouter/angularjs').default;

require('ng-redux');
const reduxThunk = require('redux-thunk').default;
const cloneDeep = require('lodash/cloneDeep');
const objectPath = require('object-path');
const lineage = require('@medic/lineage')();

require('moment');
require('moment/locale/bm');
require('moment/locale/es');
require('moment/locale/fr');
require('moment/locale/hi');
require('moment/locale/id');
require('moment/locale/ne');
require('moment/locale/sw');

require('./services');
require('./actions');
require('./reducers');
require('./selectors');
require('./controllers');
require('./filters');
require('./directives');
require('./enketo/main');

const bootstrapper = require('./bootstrapper');
const router = require('./router');
const _ = require('underscore');
_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g,
};

const minifySelected = selected => {
  const pathsToMinify = ['doc', 'formatted'];
  const lineageDocs = objectPath.get(selected, 'lineage', []);
  const docsToMinify = pathsToMinify
    .map(path => objectPath.get(selected, path))
    .filter(doc => doc)
    .concat(lineageDocs);

  docsToMinify.forEach(lineage.minify);
};
const makeLoggable = object => {
  if (Array.isArray(object.selected)) {
    object.selected.forEach(minifySelected);
  } else {
    minifySelected(object.selected);
  }
};
const reduxLoggerConfig = {
  actionTransformer: function(action) {
    const loggableAction = cloneDeep(action);
    makeLoggable(loggableAction.payload);
    try {
      JSON.stringify(loggableAction);
    } catch(error) {
      loggableAction.payload = 'Payload is not serializable';
    }
    return loggableAction;
  },
  stateTransformer: function(state) {
    let loggableState = cloneDeep(state);
    makeLoggable(loggableState);
    try {
      JSON.stringify(loggableState);
    } catch(error) {
      loggableState = 'State is not serializable';
    }
    return loggableState;
  },
  collapsed: true
};

(function() {
  'use strict';

  angular.module('inboxApp', [
    'ngRoute',
    'inboxControllers',
    'inboxDirectives',
    'inboxFilters',
    'inboxServices',
    'ipCookie',
    'ngRedux',
    'nvd3',
    'pascalprecht.translate',
    'pouchdb',
    'ui.bootstrap',
    uiRouter,
  ]);

  angular.module('inboxApp').config(function(
    $compileProvider,
    $locationProvider,
    $ngReduxProvider,
    $stateProvider,
    $translateProvider,
    $urlRouterProvider,
    Reducers
  ) {
    'ngInject';
    $locationProvider.hashPrefix('');
    $urlRouterProvider.otherwise('/error/404');
    router($stateProvider);
    $urlRouterProvider.when('', '/home');
    $urlRouterProvider.when('/messages/{uuid:[^:]*}', '/messages/contact:{uuid}');
    $translateProvider.useLoader('TranslationLoader', {});
    $translateProvider.useSanitizeValueStrategy('escape');
    $translateProvider.addInterpolation('$translateMessageFormatInterpolation');
    $translateProvider.addInterpolation('TranslationNullInterpolation');
    $translateProvider.useMissingTranslationHandlerLog();
    $compileProvider.aHrefSanitizationWhitelist(
      /^\s*(https?|ftp|mailto|tel|sms|file|blob):/
    );
    var isDevelopment = window.location.hostname === 'localhost';
    $compileProvider.debugInfoEnabled(isDevelopment);

    var middlewares = [reduxThunk];
    if (isDevelopment) {
      var reduxLogger = require('redux-logger');
      middlewares.push(reduxLogger.createLogger(reduxLoggerConfig));
    }
    $ngReduxProvider.createStoreWith(Reducers, middlewares);
  });

  angular.module('inboxApp').constant('APP_CONFIG', {
    name: '@@APP_CONFIG.name',
    version: '@@APP_CONFIG.version',
  });
  var POUCHDB_OPTIONS = {
    local: { auto_compaction: true },
    remote: {
      skip_setup: true,
      fetch: function(url, opts) {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname === '/') {
          parsedUrl.pathname = '/dbinfo';
          url = parsedUrl.toString();
        }
        opts.headers.set('Accept', 'application/json');
        opts.credentials = 'same-origin';
        return window.PouchDB.fetch(url, opts);
      },
    },
  };
  angular.module('inboxApp').constant('POUCHDB_OPTIONS', POUCHDB_OPTIONS);

  if (window.location.href === 'http://localhost:9876/context.html') {
    // karma unit testing - do not bootstrap
    return;
  }

  var ROUTE_PERMISSIONS = {
    tasks: 'can_view_tasks',
    messages: 'can_view_messages',
    contacts: 'can_view_contacts',
    analytics: 'can_view_analytics',
    reports: 'can_view_reports',
    'reports.edit': ['can_update_reports', 'can_view_reports']
  };

  var getRequiredPermissions = function(route) {
    return ROUTE_PERMISSIONS[route] || ROUTE_PERMISSIONS[route.split('.')[0]];
  };

  // Detects reloads or route updates (#/something)
  angular.module('inboxApp').run(function($state, $transitions, Auth) {
    $transitions.onBefore({}, function(trans) {
      if (trans.to().name.indexOf('error') === -1) {
        const permissions = getRequiredPermissions(trans.to().name);
        if (permissions && permissions.length) {
          return Auth(permissions).catch(function() {
            return $state.target('error', { code: 403 });
          });
        }
      }
    });
  });

  bootstrapper(POUCHDB_OPTIONS, function(err) {
    if (err) {
      if (err.redirect) {
        window.location.href = err.redirect;
      } else {
        console.error('Error bootstrapping', err);
        setTimeout(function() {
          // retry initial replication automatically after one minute
          window.location.reload(false);
        }, 60 * 1000);
      }
      return;
    }
    window.startupTimes.bootstrapped = performance.now();
    angular.element(document).ready(function() {
      angular.bootstrap(document, ['inboxApp'], {
        strictDi: true,
      });
    });
  });
})();
