import * as moment from 'moment';
import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { TranslateService as NgxTranslateService } from '@ngx-translate/core';

import { SettingsService } from '@mm-services/settings.service';
import { FormatDateService } from '@mm-services/format-date.service';

const localeCookieKey = 'locale';

@Injectable({
  providedIn: 'root'
})
export class LanguageCookieService {
  constructor(
    private cookieService:CookieService
  ) {
  }

  private language;
  private setLanguageCache(value) {
    this.language = value;
  }

  get() {
    if (this.language) {
      return this.language;
    }

    this.setLanguageCache(this.cookieService.get(localeCookieKey));
    return this.language;
  }
  /**
   * Set the language for the current session.
   * @param value the language code, eg. 'en', 'es' ...
   */
  set(value) {
    this.cookieService.set(localeCookieKey, value, 365, '/');
    this.setLanguageCache(value);
    return value;
  }
}

@Injectable({
  providedIn: 'root'
})
export class SetLanguageService {
  constructor(
    private ngxTranslateService:NgxTranslateService,
    private languageCookieService:LanguageCookieService,
    private formatDateService:FormatDateService,
  ) {
  }

  private setDatepickerLanguage(language) {
    const availableCalendarLanguages = Object.keys((<any>$.fn).datepicker.dates);
    const calendarLanguage = availableCalendarLanguages.indexOf(language) >= 0 ? language : 'en';
    (<any>$.fn).datepicker.defaults.language = calendarLanguage;
  }

  async set(code, setLanguageCookie?) {
    moment.locale([ code, 'en' ]);
    this.formatDateService.init();
    this.setDatepickerLanguage(code);
    await this.ngxTranslateService.use(code).toPromise();

    if (setLanguageCookie !== false) {
      this.languageCookieService.set(code);
    }
  }
}


@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  constructor(
    private cookieService:CookieService,
    private languageCookieService:LanguageCookieService,
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
    const cookieVal = this.getSync();
    if (cookieVal) {
      return Promise.resolve(cookieVal);
    }

    return this
      .fetchLocale()
      .then(locale => this.languageCookieService.set(locale));
  }

  getSync() {
    return this.languageCookieService.get();
  }
}
