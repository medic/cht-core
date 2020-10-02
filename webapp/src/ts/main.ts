// While we already do this earlier in inbox.js we have to check again for Karma
// tests as they don't hit that code
if (!window.startupTimes) {
  window.startupTimes = {};
}
window.startupTimes.firstCodeExecution = performance.now();

window.PouchDB = require('pouchdb-browser').default;
window.PouchDB.plugin(require('pouchdb-debug'));
window.$ = window.jQuery = require('jquery');
//window.d3 = require('d3');

//import * as Select2 from '../../node_modules/select2/dist/js/select2.full';
//require('nvd3');

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app.module';
import { environment } from './environments/environment';
import { POUCHDB_OPTIONS } from './constants';

import * as bootstrapper from './bootstrapper';

require('select2');

//const KARMA_UNIT_TEST_PORT = '9876';

(function() {
  'use strict';

  /*angular.module('inboxApp', [
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
    RootReducer,
    Selectors
  ) {
    'ngInject';
    $locationProvider.hashPrefix('');
    $urlRouterProvider.otherwise('/error/404');
    router($stateProvider);
    $urlRouterProvider.when('', '/home');
    $urlRouterProvider.when('/messages/{uuid:[^:]*}', '/messages/contact:{uuid}');
    $translateProvider.useLoader('TranslationLoaderService', {});
    $translateProvider.useSanitizeValueStrategy('escape');
    $translateProvider.addInterpolation('TranslationMessageFormatInterpolation');
    $translateProvider.addInterpolation('TranslationNullInterpolation');
    $translateProvider.useMissingTranslationHandlerLog();
    $compileProvider.aHrefSanitizationWhitelist(
      /^\s*(https?|ftp|mailto|tel|sms|file|blob):/
    );

    const isDevelopment = window.location.hostname === 'localhost' && window.location.port !== KARMA_UNIT_TEST_PORT;
    $compileProvider.debugInfoEnabled(isDevelopment);

    const middlewares = [reduxThunk];
    if (isDevelopment) {
      const reduxLogger = require('redux-logger');
      middlewares.push(reduxLogger.createLogger(createReduxLoggerConfig(Selectors)));
    }
    $ngReduxProvider.createStoreWith(RootReducer, middlewares);
  });

  // 32 million characters is guaranteed to be rejected by the API JSON
  // parser limit of 32MB so don't even bother POSTing. If there are many
  // 2 byte characters then a smaller body may also fail. Detecting the
  // exact byte length of a string is too expensive so we let the request
  // go and if it's still too long then API will respond with a 413.
  const BODY_LENGTH_LIMIT = 32000000; // 32 million
  const POUCHDB_OPTIONS = {
    local: { auto_compaction: true },
    remote: {
      skip_setup: true,
      fetch: function(url, opts) {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname === '/') {
          parsedUrl.pathname = '/dbinfo';
          url = parsedUrl.toString();
        }
        if (opts.body && opts.body.length > BODY_LENGTH_LIMIT) {
          return Promise.reject({
            message: 'Payload Too Large',
            code: 413
          });
        }
        Object.keys(POUCHDB_OPTIONS.remote_headers).forEach(header => {
          opts.headers.set(header, POUCHDB_OPTIONS.remote_headers[header]);
        });
        opts.credentials = 'same-origin';
        return window.PouchDB.fetch(url, opts);
      },
    },
    remote_headers: {
      'Accept': 'application/json'
    }
  };

  angular.module('inboxApp').constant('POUCHDB_OPTIONS', POUCHDB_OPTIONS);

  if (window.location.href === 'http://localhost:9876/context.html') {
    // karma unit testing - do not bootstrap
    return;
  }

  const ROUTE_PERMISSIONS = {
    tasks: 'can_view_tasks',
    messages: 'can_view_messages',
    contacts: 'can_view_contacts',
    analytics: 'can_view_analytics',
    reports: 'can_view_reports',
    'reports.edit': ['can_update_reports', 'can_view_reports']
  };

  const getRequiredPermissions = function(route) {
    return ROUTE_PERMISSIONS[route] || ROUTE_PERMISSIONS[route.split('.')[0]];
  };

  // Detects reloads or route updates (#/something)
  angular.module('inboxApp').run(function($state, $transitions, AuthService) {
    $transitions.onBefore({}, function(trans) {
      if (trans.to().name.indexOf('error') === -1) {
        const permissions = getRequiredPermissions(trans.to().name);
        if (permissions && permissions.length) {
          return AuthService.has(permissions).then(hasPermission => {
            if (!hasPermission) {
              $state.target('error', { code: 403 });
            }
          });
        }
      }
    });
  });
  */
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
    if (environment.production) {
      enableProdMode();
    }

    platformBrowserDynamic()
      .bootstrapModule(AppModule, { preserveWhitespaces: true })
      .catch(err => console.error(err));
  });

})();
