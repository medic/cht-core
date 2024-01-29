import { Injectable } from '@angular/core';
import { isString as _isString } from 'lodash-es';

import { EnketoTranslationService } from '@mm-services/enketo-translation.service';

@Injectable({
  providedIn: 'root'
})
export class EnketoPrepopulationDataService {
  constructor(
    private enketoTranslationService:EnketoTranslationService,
  ) {}

  get(userSettings, model, data) {
    if (data && _isString(data)) {
      return data;
    }

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
      this.enketoTranslationService.bindJsonToXml(userRoot, userSettings);
    }

    return new XMLSerializer().serializeToString(bindRoot[0]);
  }
}
