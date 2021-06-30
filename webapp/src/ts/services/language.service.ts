import * as moment from 'moment';
import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { TranslateService as NgxTranslateService } from '@ngx-translate/core';

import { SettingsService } from '@mm-services/settings.service';

const localeCookieKey = 'locale';

@Injectable({
  providedIn: 'root'
})
export class SetLanguageCookieService {
  constructor(
    private cookieService:CookieService
  ) {
  }

  /**
   * Set the language for the current session.
   * @param value the language code, eg. 'en', 'es' ...
   */
  set(value) {
    this.cookieService.set(localeCookieKey, value, 365, '/');
    return value;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SetLanguageService {
  constructor(
    private ngxTranslateService:NgxTranslateService,
    private setLanguageCookieService:SetLanguageCookieService,
  ) {
  }

  private setDatepickerLanguage(language) {
    const availableCalendarLanguages = Object.keys((<any>$.fn).datepicker.dates);
    const calendarLanguage = availableCalendarLanguages.indexOf(language) >= 0 ? language : 'en';
    (<any>$.fn).datepicker.defaults.language = calendarLanguage;
  }

  async set(code, setLanguageCookie?) {
    moment.locale([ code, 'en' ]);
    this.setDatepickerLanguage(code);
    await this.ngxTranslateService.use(code).toPromise();

    if (setLanguageCookie !== false) {
      this.setLanguageCookieService.set(code);
    }
  }
}


@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  constructor(
    private cookieService:CookieService,
    private setLanguageCookieService:SetLanguageCookieService,
    private settingsService:SettingsService,
  ) {
  }

  private readonly DEFAULT_LOCALE = 'en';

  private fetchLocale() {
    return this.settingsService
      .get()
      .then((settings:any) => {
        return settings.locale || this.DEFAULT_LOCALE;
      });
  }

  get() {
    const cookieVal = this.cookieService.get(localeCookieKey);
    if (cookieVal) {
      return Promise.resolve(cookieVal);
    }

    return this
      .fetchLocale()
      .then(locale => this.setLanguageCookieService.set(locale));
  }
}
