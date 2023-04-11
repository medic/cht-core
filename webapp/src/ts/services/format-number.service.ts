import { Injectable } from '@angular/core';
import { isNumber, isString } from 'lodash-es';
import { devanagari as toDevanagariDigit } from 'eurodigit/src/to_non_euro';

import { LanguageService } from '@mm-services/language.service';

@Injectable({
  providedIn: 'root',
})
export class FormatNumberService {
  constructor(
    private languageService:LanguageService,
  ) {}

  localize(value) {
    if (!isNumber(value) && !isString(value)) {
      return value;
    }

    if (this.languageService.useDevanagariScript()) {
      if (Number(value) === 0) {
        // toDevanagariDigit has trouble with the number 0
        value = String(value);
      }

      return toDevanagariDigit(value);
    }

    return value;
  }
}
