import * as moment from 'moment';
import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from './settings.service';
import { UserSettingsService } from './user-settings.service';

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
    private translateService:TranslateService,
    private setLanguageCookieService:SetLanguageCookieService,
  ) {
  }

  private setDatepickerLanguage(language) {
    const availableCalendarLanguages = Object.keys((<any>$.fn).datepicker.dates);
    const calendarLanguage = availableCalendarLanguages.indexOf(language) >= 0 ? language : 'en';
    (<any>$.fn).datepicker.defaults.language = calendarLanguage;
  }

  set(code, setLanguageCookie?) {
    moment.locale([ code, 'en' ]);
    this.setDatepickerLanguage(code);
    this.translateService.use(code);

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
    private userSettingsService:UserSettingsService,
  ) {
  }

  private fetchLocale() {
    return this.userSettingsService
      .get()
      .then((user:any) => {
        if (user && user.language) {
          return user.language;
        }

        return this.settingsService
          .get()
          .then((settings:any) => {
            return settings.locale || 'en';
          });
      });
  };

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
