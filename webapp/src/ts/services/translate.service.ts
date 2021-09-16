/**
 * Service to act as a wrapper for ngx-translate's TranslateService and encapsulate repeatedly used translation logic
 */

import { TranslateService as NgxTranslateService } from '@ngx-translate/core';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  constructor(
    private ngxTranslateService:NgxTranslateService,
  ) {
  }

  fieldIsRequired(fieldKey) {
    return this
      .get(fieldKey)
      .then(field => this.get('field is required', { field: field }));
  }

  // ngx-translate's TranslateService throws an error if the key is not defined or is an empty string
  private invalidKey(key) {
    return !key || !key.length;
  }

  get(key, interpolateParams?) {
    if (this.invalidKey(key)) {
      return Promise.resolve(key);
    }

    return this.ngxTranslateService.get(key, interpolateParams).toPromise();
  }

  instant(key, interpolateParams?) {
    if (this.invalidKey(key)) {
      return key;
    }

    return this.ngxTranslateService.instant(key, interpolateParams);
  }
}
