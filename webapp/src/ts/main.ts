// While we already do this earlier in the index.html we have to check again for Karma
// tests as they don't hit that code
if (!window.startupTimes) {
  window.startupTimes = {};
}
window.startupTimes.firstCodeExecution = performance.now();

window.PouchDB = require('pouchdb-browser').default;
window.$ = window.jQuery = require('jquery');
window.Tour = require('../js/bootstrap-tour-standalone');

import { enableProdMode } from '@angular/core';
import '@angular/compiler';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import pouchdbDebug from 'pouchdb-debug';

import { AppModule } from './app.module';
import { environment } from './environments/environment';
import { POUCHDB_OPTIONS } from './constants';

import * as bootstrapper from '../js/bootstrapper';

// Moment additional locales
require('../js/moment-locales/tl');
require('../js/moment-locales/hil');
require('../js/moment-locales/ceb');
require('../js/moment-locales/lg');

require('select2');
require('../js/enketo/main');

window.PouchDB.plugin(pouchdbDebug);
bootstrapper(POUCHDB_OPTIONS, (err) => {
  if (err) {
    if (err.redirect) {
      window.location.href = err.redirect;
    } else {
      console.error('Error bootstrapping', err);
      setTimeout(() => {
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
    .then((moduleRef) => {
      window.CHTCore = moduleRef.instance.integration;
      // backwards compatibility with the old way of reaching these services, the syntax looked like:
      // angular.element(document.body).injector().get(<serviceName>);
      window.angular = {
        element: () => ({
          injector: () => ({
            get: service => moduleRef.instance.integration.get(service),
          })
        })
      };
    })
    .catch(err => console.error(err));
});
