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
require('angular-ui-bootstrap');
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

var bootstrapper = require('./bootstrap');
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
      router($stateProvider);
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

  // Protractor waits for requests to complete so we have to disable
  // long polling requests.
  app.constant('E2ETESTING', window.location.href.indexOf('e2eTesting=true') !== -1);
  app.constant('CONTACT_TYPES', [ 'district_hospital', 'health_center', 'clinic', 'person' ]);
  app.constant('PLACE_TYPES', [ 'district_hospital', 'health_center', 'clinic' ]);
  app.constant('APP_CONFIG', {
    name: '@@APP_CONFIG.name',
    version: '@@APP_CONFIG.version'
  });

  bootstrapper(function() {
    angular.element(document).ready(function() {
      angular.bootstrap(document, [ 'inboxApp' ]);
    });
  });

}());
