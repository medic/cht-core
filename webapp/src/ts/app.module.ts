import { NgModule } from '@angular/core';
import { MissingTranslationHandler, MissingTranslationHandlerParams, } from '@ngx-translate/core';
import * as _ from 'lodash-es';
import { IntegrationApiService } from '@mm-services/integration-api.service';

_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;


// const logger = reducer => {
//   // default, no options
//   return storeLogger({
//     collapsed: true,
//   })(reducer);
// };
// const metaReducers = environment.production ? [] : [logger];

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
