import * as moment from 'moment';
import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { TranslateService as NgxTranslateService } from '@ngx-translate/core';

import { SettingsService } from '@mm-services/settings.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { TelemetryService } from '@mm-services/telemetry.service';

@Injectable({
  providedIn: 'root'
})
export class LanguageCookieService {
  constructor(
    private cookieService:CookieService
  ) {
  }

  private readonly LOCALE_COOKIE_KEY = 'locale';
  private language;
  private setLanguageCache(value) {
    this.language = value;
  }

  get() {
    if (this.language) {
      return this.language;
    }

    this.setLanguageCache(this.cookieService.get(this.LOCALE_COOKIE_KEY));
    return this.language;
  }

  /**
   * Set the language for the current session.
   * @param value the language code, eg. 'en', 'es' ...
   */
  set(value) {
    this.cookieService.set(this.LOCALE_COOKIE_KEY, value, 365, '/');
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
    private telemetryService:TelemetryService,
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
    this.setDatepickerLanguage(code);
    await this.ngxTranslateService.use(code).toPromise();

    if (setLanguageCookie !== false) {
      this.languageCookieService.set(code);
    }

    // formatDateService depends on the cookie, so also wait for the cookie to be updated
    await this.formatDateService.init();
    this.telemetryService.record(`user_settings:language:${code}`);
  }
}


@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  constructor(
    private languageCookieService:LanguageCookieService,
    private settingsService:SettingsService,
  ) {
  }

  private readonly DEFAULT_LOCALE = 'en';
  private readonly NEPALI_LOCALE = 'ne';

  private async fetchLocale() {
    const settings = await this.settingsService.get();
    return settings.locale || this.DEFAULT_LOCALE;
  }

  async get() {
    const cookieVal = this.languageCookieService.get();
    if (cookieVal) {
      return cookieVal;
    }

    const locale = await this.fetchLocale();
    return this.languageCookieService.set(locale);
  }

  useDevanagariScript() {
    const language = this.languageCookieService.get();
    return language === this.NEPALI_LOCALE;
  }
}
