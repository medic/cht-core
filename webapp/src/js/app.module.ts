import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { setAngularLib, UpgradeModule } from '@angular/upgrade/static';

// console.log('~~~~~~~~~~~~~~~~~ 0');

// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
// import * as angular from 'angular';
// import 'zone.js';

// setAngularLib(angular);
// window.PouchDB = require('pouchdb-browser').default;
// // window.PouchDB.plugin(require('pouchdb-debug'));
// window.$ = window.jQuery = require('jquery');
// window.d3 = require('d3');

// require('./services');
// require('./controllers');
// require('./filters');
// require('./directives');
// require('./enketo/main');

@NgModule({
  imports: [BrowserModule, UpgradeModule],
})
export class AppModule {
  ngDoBootstrap() {
    console.log('~~~~~~~~~~~~~ a');
  }
}

// angular.element(document).ready(function() {
//   console.log('~~~~~~~~~~~~~~~~~ 4');
//   platformBrowserDynamic()
//     .bootstrapModule(AppModule)
//     .then(platformRef => {
//       console.log('~~~~~~~~~~~~~~~~~ 5');
//       const upgrade = platformRef.injector.get(
//         UpgradeModule
//       ) as UpgradeModule;
//       console.log('bootstrapping');
//       upgrade.bootstrap(document.body, ['inboxApp'], { strictDi: true });
//     });
// });
