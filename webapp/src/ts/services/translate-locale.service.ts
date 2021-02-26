import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { map, take, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TranslateLocaleService {
  constructor(
    private translateService:TranslateService,
  ) {
  }

  private loadingTranslations = {};

  private loadTranslations(locale) {
    return this.translateService
      .currentLoader
      .getTranslation(locale)
      .pipe(
        shareReplay(1),
        take(1)
      );
  }

  private getTranslation(locale) {
    if (this.translateService.translations[locale]) {
      return;
    }

    if (this.loadingTranslations[locale]) {
      return;
    }

    const loadingTranslations = this.loadTranslations(locale);
    const translationsCompiled = loadingTranslations
      .pipe(
        map((res) => this.translateService.compiler.compileTranslations(res, locale)),
        shareReplay(1),
        take(1),
      );
    translationsCompiled.subscribe((res) => {
      this.translateService.translations[locale] = res;
      this.translateService.addLangs(Object.keys(this.translateService.translations));
      delete this.loadingTranslations[locale];
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

  reloadLang(locale, hotReload = false) {
    if (!this.translateService.translations[locale]) {
      // don't "reload" languages we haven't already loaded
      return;
    }

    if (!hotReload) {
      // reloading "secondary" languages
      this.translateService.resetLang(locale);
      this.getTranslation(locale);
      return;
    }

    // We're forced to use this method to hot reload
    // there are only 2 methods that emit `onTranslationChange`, this method being one of them
    // the 2nd method (set) is a poorer choice, as it requires setting a translation key + value
    // https://github.com/ngx-translate/core/issues/874
    this.loadTranslations(locale).subscribe(rawTranslations => {
      this.translateService.setTranslation(locale, rawTranslations);
    });
  }
}
