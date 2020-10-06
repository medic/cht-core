import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class TranslateLocaleService {
  constructor(
    private translateService:TranslateService,
  ) {
  }

  private getTranslation(locale) {
    return this.translateService.getTranslation(locale);
  }

  translate(key, params, locale, skipInterpolation = false) {
    return this.getTranslation(locale).subscribe(() => {
      return this.instant(key, params, locale, skipInterpolation);
    });
  }

  // todo Create issue about the use of "instant" without pre-loading translations
  // this issue existed before the migration to AngularX
  instant(key, params, locale, skipInterpolation = false) {
    console.log(JSON.parse(JSON.stringify(this.translateService.translations)));
    if (!this.translateService.translations[locale]) {
      this.getTranslation(locale).subscribe(() => {
        console.log(...this.translateService.translations);
      });
    }


    if (skipInterpolation) {
      return this.translateService.translations[locale] && this.translateService.translations[locale][key];
    }

    return this.translateService.getParsedResult(this.translateService.translations[locale], key, params);
  }
}
