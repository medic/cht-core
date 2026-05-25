import {
  ApplicationConfig,
  importProvidersFrom,
  APP_INITIALIZER,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  provideHttpClient,
  HttpInterceptorFn,
  withInterceptors,
} from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import {
  TranslateModule,
  TranslateLoader,
  MissingTranslationHandler,
  MissingTranslationHandlerParams,
  TranslateService,
} from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';

import { AppRoutingModule } from './app-routing.module';
import { SessionService } from '@admin-tool-services/session.service';
import { DbService } from '@admin-tool-services/db.service';
import { AppRouteGuardProvider } from '@admin-tool-providers/app-route.guard.provider';
import { TranslationLoaderProvider } from '@admin-tool-providers/translation-loader.provider';

export class MissingTranslationHandlerLog implements MissingTranslationHandler {
  handle = (params: MissingTranslationHandlerParams) => params.key;
}

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req.clone({ withCredentials: true }));
};

export const createTranslationLoader = (db: DbService) => new TranslationLoaderProvider(db);

const initSession = (session: SessionService) => () => session.init();

const initLanguage = (translate: TranslateService) => () => {
  translate.setDefaultLang('en');
  return translate.use('en');
};

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
      AppRoutingModule,
      RouterModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslationLoader,
          deps: [DbService],
        },
        missingTranslationHandler: {
          provide: MissingTranslationHandler,
          useClass: MissingTranslationHandlerLog,
        },
      }),
    ),
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    provideAnimations(),
    CookieService,
    AppRouteGuardProvider,
    {
      provide: APP_INITIALIZER,
      useFactory: initSession,
      deps: [SessionService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initLanguage,
      deps: [TranslateService],
      multi: true,
    },
  ],
};
