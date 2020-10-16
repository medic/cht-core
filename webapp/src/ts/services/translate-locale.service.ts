import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { map, shareReplay, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TranslateLocaleService {
  constructor(
    private translateService:TranslateService,
  ) {
  }

  private loadingTranslations = {};

  private getTranslation(locale) {
    if (this.translateService.translations[locale]) {
      return;
    }

    if (this.loadingTranslations[locale]) {
      return;
    }

    const loadingTranslations = this.translateService
      .currentLoader
      .getTranslation(locale)
      .pipe(
        shareReplay(1),
        take(1)
      );
    const translationsCompiled = loadingTranslations
      .pipe(
        map((res) => this.translateService.compiler.compileTranslations(res, locale)),
        shareReplay(1),
        take(1)
      );
    translationsCompiled.subscribe((res) => {
      this.translateService.translations[locale] = res;
      this.translateService.addLangs(Object.keys(this.translateService.translations));
    });
    this.loadingTranslations[locale] = translationsCompiled;
  }

  // todo Create issue about the use of "instant" without pre-loading translations
  // this issue existed before the migration to AngularX
  instant(key, params, locale, skipInterpolation = false) {
    this.getTranslation(locale);

    if (skipInterpolation) {
      return this.translateService.translations[locale] && this.translateService.translations[locale][key];
    }

    return this.translateService.getParsedResult(this.translateService.translations[locale], key, params);
  }
}
