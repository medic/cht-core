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
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { EffectsModule } from '@ngrx/effects';
import * as _ from 'lodash-es';
_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;


import { AppRoutingModule } from './app-routing.module';
import { AppRouteGuardProvider } from './app-route.guard.provider';
import { AppComponent } from './app.component';
import { ModulesModule } from '@mm-modules/modules.module';
import { environment } from '@mm-environments/environment';
import { ComponentsModule } from '@mm-components/components.module';
import { ModalsModule } from '@mm-modals/modals.module';
import { DirectivesModule } from '@mm-directives/directives.module';
import { PipesModule } from '@mm-pipes/pipes.module';
import { DbService } from '@mm-services/db.service';
import { IntegrationApiService } from '@mm-services/integration-api.service';
import { AnalyticsRouteGuardProvider } from '@mm-modules/analytics/analytics-route.guard.provider';
import { TranslationLoaderProvider } from '@mm-providers/translation-loader.provider';
import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';
import { ExceptionHandlerProvider } from '@mm-providers/exception-handler.provider';
import { ParseProvider } from '@mm-providers/parse.provider';
import { GlobalEffects } from '@mm-effects/global.effects';
import { ReportsEffects } from '@mm-effects/reports.effects';
import { ContactsEffects } from '@mm-effects/contacts.effects';
import { reducers } from '@mm-reducers/index';

const logger = reducer => {
  // default, no options
  return storeLogger({
    collapsed: true,
  })(reducer);
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
    BrowserAnimationsModule,
    BsDropdownModule.forRoot(),
    FormsModule,
    AccordionModule.forRoot(),
    EffectsModule.forRoot([ GlobalEffects, ReportsEffects, ContactsEffects ]),
  ],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/' },
    { provide: ErrorHandler, useClass: ExceptionHandlerProvider },
    AppRouteGuardProvider,
    AnalyticsRouteGuardProvider,
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
