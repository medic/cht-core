import { IntegrationApiService } from '@mm-services/integration-api.service';

const logger = reducer => {
  // default, no options
  return storeLogger({
    collapsed: true,
  })(reducer);
};
const metaReducers = environment.production ? [] : [logger];

// While we already do this earlier in the index.html we have to check again for Karma
// tests as they don't hit that code
if (!window.startupTimes) {
  window.startupTimes = {};
}
window.startupTimes.firstCodeExecution = performance.now();

window.PouchDB = require('pouchdb-browser').default;
window.$ = window.jQuery = require('jquery');

import { enableProdMode, importProvidersFrom } from '@angular/core';
import '@angular/compiler';
import pouchdbDebug from 'pouchdb-debug';
import * as $ from 'jquery';

import { environment } from '@mm-environments/environment';
import { POUCHDB_OPTIONS } from './constants';

import * as bootstrapper from '../js/bootstrapper';
import { APP_BASE_HREF, DatePipe } from '@angular/common';
import { AppRouteGuardProvider } from './app-route.guard.provider';
import { TrainingCardDeactivationGuardProvider } from './training-card.guard.provider';
import { AnalyticsRouteGuardProvider } from '@mm-modules/analytics/analytics-route.guard.provider';
import { CookieService } from 'ngx-cookie-service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { StoreModule } from '@ngrx/store';
import { reducers } from '@mm-reducers/index';
import { storeLogger } from 'ngrx-store-logger';
import {
  TranslateModule,
  TranslateLoader,
  MissingTranslationHandler,
  TranslateCompiler,
  MissingTranslationHandlerParams
} from '@ngx-translate/core';
import { DbService } from '@mm-services/db.service';
import { TranslationLoaderProvider } from '@mm-providers/translation-loader.provider';
import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { FormsModule } from '@angular/forms';
import { EffectsModule } from '@ngrx/effects';
import { GlobalEffects } from '@mm-effects/global.effects';
import { ReportsEffects } from '@mm-effects/reports.effects';
import { ContactsEffects } from '@mm-effects/contacts.effects';
import { AppComponent } from './app.component';

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
require('moment/locale/ar');

require('select2');
require('../js/enketo/main');

// Enable jQuery support for self-closing xml tags
// https://jquery.com/upgrade-guide/3.5/
const rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi;
// eslint-disable-next-line no-import-assign
Object.defineProperties($, {
  htmlPrefilter: { value: (html) => html.replace(rxhtmlTag, '<$1></$2>') }
});

class MissingTranslationHandlerLog implements MissingTranslationHandler {
  handle = (params: MissingTranslationHandlerParams) => params.key;
}

window.PouchDB.plugin(pouchdbDebug);
bootstrapper(POUCHDB_OPTIONS)
  .then(() => {
    window.startupTimes.bootstrapped = performance.now();
    if (environment.production) {
      enableProdMode();
    }

    return bootstrapApplication(AppComponent, {
      providers: [
        importProvidersFrom(
          BrowserModule,
          AppRoutingModule,
          RouterModule,
          StoreModule.forRoot(reducers, { metaReducers }),
          TranslateModule.forRoot({
            loader: {
              provide: TranslateLoader,
              useFactory: (db: DbService) => new TranslationLoaderProvider(db),
              deps: [DbService],
            },
            missingTranslationHandler: {
              provide: MissingTranslationHandler,
              useClass: MissingTranslationHandlerLog
            },
            compiler: {
              provide: TranslateCompiler,
              useClass: TranslateMessageFormatCompilerProvider,
            },
          }),
          BsDropdownModule.forRoot(),
          FormsModule,
          EffectsModule.forRoot([GlobalEffects, ReportsEffects, ContactsEffects])
        ),
        { provide: APP_BASE_HREF, useValue: '/' },
        AppRouteGuardProvider,
        TrainingCardDeactivationGuardProvider,
        AnalyticsRouteGuardProvider,
        CookieService,
        ParseProvider,
        DatePipe,
        provideHttpClient(withInterceptorsFromDi()),
        provideAnimations()
      ]
    })
      .then((moduleRef) => {
        window.CHTCore = moduleRef.injector.get(IntegrationApiService);
      })
      .catch(err => console.error(err));
  })
  .catch(err => {
    console.error('Error bootstrapping', err);
    setTimeout(() => {
      // retry initial replication automatically after one minute
      window.location.reload();
    }, 60 * 1000);
  });
