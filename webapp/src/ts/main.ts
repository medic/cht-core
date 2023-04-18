// While we already do this earlier in the index.html we have to check again for Karma
// tests as they don't hit that code
if (!window.startupTimes) {
  window.startupTimes = {};
}
window.startupTimes.firstCodeExecution = performance.now();

window.PouchDB = require('pouchdb-browser').default;
window.$ = window.jQuery = require('jquery');

import { enableProdMode } from '@angular/core';
import '@angular/compiler';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import pouchdbDebug from 'pouchdb-debug';
import * as $ from 'jquery';

import { AppModule } from './app.module';
import { environment } from '@mm-environments/environment';
import { POUCHDB_OPTIONS } from './constants';

import * as bootstrapper from '../js/bootstrapper';

// Moment additional locales
require('../js/moment-locales/tl');
require('../js/moment-locales/hil');
require('../js/moment-locales/ceb');
require('../js/moment-locales/lg');
require('moment/locale/fr');
require('moment/locale/es');
require('moment/locale/bm');
require('moment/locale/hi');
require('moment/locale/id');
require('moment/locale/ne');
require('moment/locale/sw');

require('select2');
require('../js/enketo/main');

// Enable jQuery support for self-closing xml tags
// https://jquery.com/upgrade-guide/3.5/
const rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi;
// eslint-disable-next-line no-import-assign
Object.defineProperties($, {
  htmlPrefilter: { value: (html) => html.replace(rxhtmlTag, '<$1></$2>') }
});

window.PouchDB.plugin(pouchdbDebug);
bootstrapper(POUCHDB_OPTIONS, (err) => {
  if (err) {
    console.error('Error bootstrapping', err);
    setTimeout(() => {
      // retry initial replication automatically after one minute
      window.location.reload();
    }, 60 * 1000);

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
