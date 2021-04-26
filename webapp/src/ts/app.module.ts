import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { APP_BASE_HREF, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { StoreModule } from '@ngrx/store';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { storeLogger } from 'ngrx-store-logger';
import { CookieService } from 'ngx-cookie-service';
import {
  TranslateModule,
  TranslateLoader,
  MissingTranslationHandler,
  MissingTranslationHandlerParams,
  TranslateCompiler,
} from '@ngx-translate/core';
import { ModalModule, BsModalRef } from 'ngx-bootstrap/modal';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { EffectsModule } from '@ngrx/effects';
import * as _ from 'lodash-es';
_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;

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
import { GlobalEffects } from '@mm-effects/global.effects';
import { ReportsEffects } from '@mm-effects/reports.effects';
import { ContactsEffects } from '@mm-effects/contacts.effects';
import { ParseProvider } from '@mm-providers/parse.provider';
import { IntegrationApiService } from '@mm-services/integration-api.service';
import { reducers } from './reducers';

import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';

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
      compiler: {
        provide: TranslateCompiler,
        useClass: TranslateMessageFormatCompilerProvider,
      },
    }),
    ModalModule.forRoot(),
    BrowserAnimationsModule,
    BsDropdownModule.forRoot(),
    FormsModule,
    AccordionModule.forRoot(),
    EffectsModule.forRoot([ GlobalEffects, ReportsEffects, ContactsEffects ]),
  ],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/' },
    { provide: ErrorHandler, useClass: ExceptionHandlerProvider },
    BsModalRef,
    RouteGuardProvider,
    CookieService,
    ParseProvider,
    DatePipe,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  integration;
  constructor(
    private integrationApiService:IntegrationApiService,
  ) {
    this.integration = integrationApiService;
  }
}
