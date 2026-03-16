import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { RouterModule } from '@angular/router';
import { withInterceptorsFromDi, provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';

import { AppRoutingModule } from './app-routing.module';
import { SessionService } from '@admin-tool-services/session.service';
import { AppRouteGuardProvider } from '@admin-tool-providers/app-route.guard.provider';

const initSession = (session: SessionService) => () => session.init();

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
      AppRoutingModule,
      RouterModule,
      TranslateModule.forRoot(),
    ),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    CookieService,
    AppRouteGuardProvider,
    {
      provide: APP_INITIALIZER,
      useFactory: initSession,
      deps: [SessionService],
      multi: true,
    },
  ]
};
