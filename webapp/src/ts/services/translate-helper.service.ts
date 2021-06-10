/**
 * Service to encapsulate repeatedly used translation logic
 */

import { TranslateService } from '@ngx-translate/core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TranslateHelperService {
  constructor(
    private translateService:TranslateService,
  ) {
  }

  fieldIsRequired(fieldKey) {
    return this
      .get(fieldKey)
      .then(field => this.get('field is required', { field: field }));
  }

  private invalidKey(key) {
    return !key || !key.length;
  }

  get(key, interpolateParams?) {
    if (this.invalidKey(key)) {
      return Promise.resolve(key);
    }

    return this.translateService.get(key, interpolateParams).toPromise();
  }

  instant(key, interpolateParams?) {
    if (this.invalidKey(key)) {
      return key;
    }

    return this.translateService.instant(key, interpolateParams);
  }
}
