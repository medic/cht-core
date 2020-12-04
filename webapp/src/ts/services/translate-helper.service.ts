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

  get(key, interpolateParams?) {
    return this.translateService.get(key, interpolateParams).toPromise();
  }
}
