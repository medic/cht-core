import { NgModule, Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { setAngularLib, UpgradeModule } from '@angular/upgrade/static';

console.log('~~~~~~~~~~~~~~~~~ 0');

import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as angular from 'angular';
import 'zone.js';

import { AppModule } from './app.module';

setAngularLib(angular);
window.PouchDB = require('pouchdb-browser').default;
// window.PouchDB.plugin(require('pouchdb-debug'));
window.$ = window.jQuery = require('jquery');
window.d3 = require('d3');

require('angular-sanitize');
require('angular-cookie');
require('angular-nvd3');
require('angular-ui-bootstrap');
require('angular-ui-router');
require('angular-translate');
require('angular-pouchdb');

require('./services');
require('./controllers');
require('./filters');
require('./directives');
require('./enketo/main');

console.log('~~~~~~~~~~~~~ z');

var app = angular.module('inboxApp', [
  'ipCookie',
  // 'ngRoute',
  'ui.bootstrap',
  'ui.router',
  'inboxDirectives',
  'inboxFilters',
  'inboxControllers',
  'inboxServices',
  'pascalprecht.translate',
  'nvd3',
  'pouchdb',
]);

app.constant('APP_CONFIG', {
  name: '@@APP_CONFIG.name',
  version: '@@APP_CONFIG.version',
});

var POUCHDB_OPTIONS = {
  local: { auto_compaction: true },
  remote: {
    skip_setup: true,
    fetch: function(url, opts) {
      opts.headers.set('Accept', 'application/json');
      opts.credentials = 'same-origin';
      return window.PouchDB.fetch(url, opts);
    },
  },
};
app.constant('POUCHDB_OPTIONS', POUCHDB_OPTIONS);

angular.element(document).ready(function() {
  console.log('~~~~~~~~~~~~~~~~~ 4');
  platformBrowserDynamic()
    .bootstrapModule(AppModule)
    .then(platformRef => {
      console.log('~~~~~~~~~~~~~~~~~ 5');
      const upgrade = platformRef.injector.get(UpgradeModule) as UpgradeModule;
      console.log('bootstrapping');
      upgrade.bootstrap(document.body, ['inboxApp'], { strictDi: true });
    });
});
