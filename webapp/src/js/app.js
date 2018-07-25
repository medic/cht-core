window.PouchDB = require('pouchdb-browser');
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
require('angular-ui-router');

require('moment');
require('moment/locale/bm');
require('moment/locale/es');
require('moment/locale/fr');
require('moment/locale/hi');
require('moment/locale/id');
require('moment/locale/ne');
require('moment/locale/sw');

require('./services');
require('./controllers');
require('./filters');
require('./directives');
require('./enketo/main');

var bootstrapper = require('./bootstrapper');
var router = require('./router');
var _ = require('underscore');
_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

(function () {

  'use strict';

  var app = angular.module('inboxApp', [
    'ipCookie',
    'ngRoute',
    'ui.bootstrap',
    'ui.router',
    'inboxDirectives',
    'inboxFilters',
    'inboxControllers',
    'inboxServices',
    'pascalprecht.translate',
    'nvd3',
    'pouchdb'
  ]);

  app.config(function(
    $compileProvider,
    $locationProvider,
    $stateProvider,
    $translateProvider,
    $urlRouterProvider
  ) {
    'ngInject';
    $locationProvider.hashPrefix('');
    $urlRouterProvider.otherwise('/error/404');
    router($stateProvider);
    $urlRouterProvider.when('', '/home');
    $urlRouterProvider.when('/messages/{uuid}', '/messages/contact:{uuid}');
    $translateProvider.useLoader('TranslationLoader', {});
    $translateProvider.useSanitizeValueStrategy('escape');
    $translateProvider.addInterpolation('$translateMessageFormatInterpolation');
    $translateProvider.addInterpolation('TranslationNullInterpolation');
    $translateProvider.useMissingTranslationHandlerLog();
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|sms|file|blob):/);
    var isDevelopment = window.location.hostname === 'localhost';
    $compileProvider.debugInfoEnabled(isDevelopment);
  });

  app.constant('APP_CONFIG', {
    name: '@@APP_CONFIG.name',
    version: '@@APP_CONFIG.version'
  });
  var POUCHDB_OPTIONS = {
    local: { auto_compaction: true },
    remote: { skip_setup: true, ajax: { timeout: 30000 }}
  };
  app.constant('POUCHDB_OPTIONS', POUCHDB_OPTIONS);

  if (window.location.href === 'http://localhost:9876/context.html') {
    // karma unit testing - do not bootstrap
    return;
  }

  bootstrapper(POUCHDB_OPTIONS, function(err) {
    if (err) {
      if (err.redirect) {
        window.location.href = err.redirect;
      } else {
        $('.bootstrap-layer').html('<div><p>Loading error, please check your connection.</p><a class="btn btn-primary" href="#" onclick="window.location.reload(false);">Try again</a></div>');
        console.error('Error fetching ddoc from remote server', err);
        setTimeout(function() {
          // retry initial replication automatically after one minute
          window.location.reload(false);
        }, 60 * 1000);
      }
      return;
    }
    angular.element(document).ready(function() {
      angular.bootstrap(document, [ 'inboxApp' ], {
        strictDi: true
      });
    });
  });

}());
