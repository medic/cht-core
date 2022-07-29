import { Injectable } from '@angular/core';
import { isString as _isString } from 'lodash-es';

import { EnketoTranslationService } from '@mm-services/enketo-translation.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguageService } from '@mm-services/language.service';

@Injectable({
  providedIn: 'root'
})
export class EnketoPrepopulationDataService {
  constructor(
    private enketoTranslationService:EnketoTranslationService,
    private userSettingsService:UserSettingsService,
    private languageService:LanguageService,
  ) {}

  get(model, data) {
    if (data && _isString(data)) {
      return Promise.resolve(data);
    }

    return Promise
      .all([
        this.userSettingsService.get(),
        this.languageService.get()
      ])
      .then(([user, language]) => {
        const xml = $($.parseXML(model));
        const bindRoot = xml.find('model instance').children().first();

        const userRoot = bindRoot.find('>inputs>user');

        if (data) {
          this.enketoTranslationService.bindJsonToXml(bindRoot, data, (name) => {
            // Either a direct child or a direct child of inputs
            return '>%, >inputs>%'.replace(/%/g, name);
          });
        }

        if (userRoot.length) {
          const userObject = { ...user, language };
          this.enketoTranslationService.bindJsonToXml(userRoot, userObject);
        }

        return new XMLSerializer().serializeToString(bindRoot[0]);
      });
  }
}
