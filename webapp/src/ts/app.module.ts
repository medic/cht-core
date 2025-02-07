import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
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
import { EffectsModule } from '@ngrx/effects';
import * as _ from 'lodash-es';
_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;


import { AppRoutingModule } from './app-routing.module';
import { AppRouteGuardProvider } from './app-route.guard.provider';
import { TrainingCardDeactivationGuardProvider } from './training-card.guard.provider';
import { AppComponent } from './app.component';

import { environment } from '@mm-environments/environment';




import { DbService } from '@mm-services/db.service';
import { IntegrationApiService } from '@mm-services/integration-api.service';
import { AnalyticsRouteGuardProvider } from '@mm-modules/analytics/analytics-route.guard.provider';
import { TranslationLoaderProvider } from '@mm-providers/translation-loader.provider';
import { TranslateMessageFormatCompilerProvider } from '@mm-providers/translate-messageformat-compiler.provider';
import { ParseProvider } from '@mm-providers/parse.provider';
import { GlobalEffects } from '@mm-effects/global.effects';
import { ReportsEffects } from '@mm-effects/reports.effects';
import { ContactsEffects } from '@mm-effects/contacts.effects';
import { reducers } from '@mm-reducers/index';
import { PrivacyPolicyComponent } from '@mm-modules/privacy-policy/privacy-policy.component';
import { SidebarMenuComponent } from '@mm-components/sidebar-menu/sidebar-menu.component';
import { HeaderComponent } from '@mm-components/header/header.component';
import { SnackbarComponent } from '@mm-components/snackbar/snackbar.component';

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

@NgModule(/* TODO(standalone-migration): clean up removed NgModule class manually. 
{
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
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
    EffectsModule.forRoot([GlobalEffects, ReportsEffects, ContactsEffects]),
    PrivacyPolicyComponent,
    SidebarMenuComponent,
    HeaderComponent,
    SnackbarComponent,
  ],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/' },
    AppRouteGuardProvider,
    TrainingCardDeactivationGuardProvider,
    AnalyticsRouteGuardProvider,
    CookieService,
    ParseProvider,
    DatePipe,
  ],
  bootstrap: [AppComponent]
} */)
export class AppModule {
  integration;
  constructor(
    private integrationApiService:IntegrationApiService,
  ) {
    this.integration = integrationApiService;
  }
}
