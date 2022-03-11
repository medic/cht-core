import { Injectable } from '@angular/core';

import * as validation from '@medic/validation';
import * as messages from '@medic/message-utils';
import { DbService } from '@mm-services/db.service';
import { SettingsService } from '@mm-services/settings.service';
import { TranslateLocaleService } from '@mm-services/translate-locale.service';
import { LanguageService } from '@mm-services/language.service';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  constructor(
    private dbService:DbService,
    private settingsService:SettingsService,
    private translateLocaleService:TranslateLocaleService,
    private languageService:LanguageService,
  ) {
  }

  private inited;
  private settings;

  async init() {
    if (this.inited) {
      return Promise.resolve();
    }

    this.settings = await this.settingsService.get();

    validation.init({
      settings: this.settings,
      db: { medic: this.dbService.get() },
      translate: this.translate.bind(this),
      logger: console
    });
    this.inited = true;
  }

  async validate(doc, config, context = {}) {
    await this.init();
    const validations = config?.validations?.list;
    if (!validations || !validations.length) {
      return Promise.resolve();
    }

    doc = { ...doc }; // don't mutate the original
    // ensure that the error messages are intelligible to the user, but don't overwrite locale if set
    doc.locale = doc.locale || await this.languageService.get();

    const errors = await validation.validate(doc, validations);
    if (!errors || !errors.length) {
      return errors;
    }

    return errors.map(error => {
      error.message = messages.template(
        this.settings,
        this.translate.bind(this),
        doc,
        error,
        context
      );
      return error;
    });
  }

  private translate(key, locale?) {
    return this.translateLocaleService.instant(key, {}, locale, true);
  }
}
