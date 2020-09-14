import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { StoreModule } from '@ngrx/store';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { storeLogger } from 'ngrx-store-logger';
import { CookieModule } from 'ngx-cookie';
import { TranslateModule, TranslateLoader, MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
import { ModalModule, BsModalRef } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';

import { environment } from './environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ComponentsModule } from './components/components.module';
import { ModalsModule } from './modals/modals.module';
import { ModulesModule } from './modules/modules.module';
import { DirectivesModule } from './directives/directives.module';
import { PipesModule } from './pipes/pipes.module';
import { TranslationLoaderProvider } from './providers/translation-loader.provider';
import { DbService } from './services/db.service';
import { RouteGuardProvider } from './providers/route-guard.provider';
import { ExceptionHandlerProvider } from './providers/exception-handler.provider';

import { reducers } from "./reducers";

const logger = reducer => {
  // default, no options
  return storeLogger()(reducer);
};
const metaReducers = environment.production ? [] : [logger];

export class MissingTranslationHandlerLog implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams) {
    return params.key;
  }
}

import * as _ from 'lodash-es';
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
    FormsModule,
  ],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/' },
    { provide: ErrorHandler, useClass: ExceptionHandlerProvider },
    BsModalRef,
    RouteGuardProvider,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
