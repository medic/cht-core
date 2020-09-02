import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from "@angular/common/http";
import { StoreModule } from '@ngrx/store';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { storeLogger } from 'ngrx-store-logger';
import { CookieModule } from "ngx-cookie";
import { TranslateModule, TranslateLoader, MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
import { ModalModule, BsModalRef } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ComponentsModule } from './components/components.module';
import { ModalsModule } from './modals/modals.module';
import {ModulesModule} from "./modules/modules.module";
import { DirectivesModule } from './directives/directives.module';
import { PipesModule } from './pipes/pipes.module';
import { TranslationLoaderProvider } from './providers/translation-loader.provider';

import { DbService } from "./services/db.service";

import { environment } from './environments/environment';

import { reducers } from "./reducers";

const logger = reducer => {
  // default, no options
  return storeLogger()(reducer);
}
const metaReducers = environment.production ? [] : [logger];

export class MissingTranslationHandlerLog implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams) {
    return params.key;
  }
}

const _ = require('lodash/core');
_.uniq = require('lodash/uniq');
_.groupBy = require('lodash/groupBy');
_.uniqBy = require('lodash/uniqBy');
_.findIndex = require('lodash/findIndex');
_.minBy = require('lodash/minBy');
_.partial = require('lodash/partial');
_.partial.placeholder = _;
_.range = require('lodash/range');
_.intersection = require('lodash/intersection');
_.toPairs = require('lodash/toPairs');
_.difference = require('lodash/difference');
_.template = require('lodash/template');
_.templateSettings = require('lodash/templateSettings');
_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ComponentsModule,
    ModalsModule,
    ModulesModule,
    DirectivesModule,
    PipesModule,
    RouterModule,
    CookieModule.forRoot(),
    HttpClientModule,
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
    }),
    ModalModule.forRoot(),
    BrowserAnimationsModule,
    BsDropdownModule.forRoot(),
  ],
  providers: [{ provide: APP_BASE_HREF, useValue: '/' }, BsModalRef ],
  bootstrap: [AppComponent]
})
export class AppModule { }
