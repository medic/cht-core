/// <reference path="medic.d.ts" />

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { UpgradeModule } from '@angular/upgrade/static';
import { AppModule } from './app.module';
import * as angular from 'angular';

window.PouchDB = require('pouchdb-browser');
window.$ = window.jQuery = require('jquery');
window.d3 = require('d3');

require('../../node_modules/select2/dist/js/select2.full');
require('bootstrap');
require('./bootstrap-multidropdown');
require('bootstrap-daterangepicker');
require('bootstrap-tour');
require('nvd3');

require('angular-cookie');
require('angular-pouchdb');
require('angular-translate');
require('angular-translate-interpolation-messageformat');
require('angular-translate-handler-log');
require('angular-ui-bootstrap');
require('angular-ui-router');
require('angularjs-nvd3-directives');

require('moment');
require('moment/locale/es');
require('moment/locale/fr');
require('moment/locale/ne');

require('./services');
require('./controllers');
require('./filters');
require('./directives');
require('./enketo/main');

var bootstrapper = require('./bootstrap');
var router = require('./router');
var _ = require('underscore');
_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

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
  'nvd3ChartDirectives',
  'pouchdb'
]);

app.config(function(
  $compileProvider,
  $stateProvider,
  $translateProvider,
  $urlRouterProvider
) {
  'ngInject';
  $urlRouterProvider.otherwise('/error/404');
  router($stateProvider);
  $urlRouterProvider.when('', '/home');
  $translateProvider.useLoader('TranslationLoader', {});
  $translateProvider.useSanitizeValueStrategy('escape');
  $translateProvider.addInterpolation('$translateMessageFormatInterpolation');
  $translateProvider.useMissingTranslationHandlerLog();
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|sms|file|blob):/);
  var isDevelopment = window.location.hostname === 'localhost';
  $compileProvider.debugInfoEnabled(isDevelopment);
});

// Protractor waits for requests to complete so we have to disable
// long polling requests.
app.constant('E2ETESTING', window.location.href.indexOf('e2eTesting=true') !== -1);
app.constant('APP_CONFIG', {
  name: '@@APP_CONFIG.name',
  version: '@@APP_CONFIG.version'
});
var POUCHDB_OPTIONS = {
  local: { auto_compaction: true },
  remote: { skip_setup: true, ajax: { timeout: 30000 }}
};
app.constant('POUCHDB_OPTIONS', POUCHDB_OPTIONS);

bootstrapper(POUCHDB_OPTIONS, function(err) {
  if (err) {
    if (err.redirect) {
      window.location.href = err.redirect;
    } else {
      $('.bootstrap-layer').html('<div><p>Loading error, please check your connection.</p><a class="btn btn-primary" href="#" onclick="window.location.reload(false);">Try again</a></div>');
      console.error('Error fetching ddoc from remote server', err);
    }
    return;
  }

  angular.element(document).ready(function() {
    platformBrowserDynamic().bootstrapModule(AppModule).then(platformRef => {
      const upgrade = platformRef.injector.get(UpgradeModule) as UpgradeModule;
      upgrade.bootstrap(document.body, [ 'inboxApp' ], { strictDi: true });
    });
    // angular.bootstrap(document, [ 'inboxApp' ], {
    //   strictDi: true
    // });
  });
});
