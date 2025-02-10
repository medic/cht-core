import { Injectable, Pipe, PipeTransform } from '@angular/core';

import { FormatNumberService } from '@mm-services/format-number.service';

@Pipe({
  name: 'localizeNumber'
})
@Injectable({
  providedIn: 'root'
})
export class LocalizeNumberPipe implements PipeTransform {
  constructor(
    private formatNumberService:FormatNumberService,
  ) {
  }

  transform(value) {
    return this.formatNumberService.localize(value);
  }
}
