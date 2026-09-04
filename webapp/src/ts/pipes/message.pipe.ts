import { Injectable, Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash-es';
import { DomSanitizer } from '@angular/platform-browser';
import { Store } from '@ngrx/store';

import { FormatProvider } from '@mm-providers/format.provider';
import { TranslateService } from '@mm-services/translate.service';
import { Selectors } from '@mm-selectors/index';

const getFormName = (record, forms) => {
  const form = _.find(forms, { code: record.form });
  if (form) {
    return form.title;
  }
  return record.form;
};

@Pipe({
  name: 'summary'
})
@Injectable({
  providedIn: 'root'
})
export class SummaryPipe implements PipeTransform {
  constructor(
    private translateService:TranslateService,
  ) {}

  transform(record, forms) {
    if (!record || !forms) {
      return '';
    }
    if (record.form) {
      return getFormName(record, forms);
    }
    if (record.message && record.message.message) {
      return record.message.message;
    }
    if (record.tasks &&
      record.tasks[0] &&
      record.tasks[0].messages &&
      record.tasks[0].messages[0]) {
      return record.tasks[0].messages[0].message;
    }
    return this.translateService.instant('tasks.0.messages.0.message');
  }
}

@Pipe({
  name: 'title'
})
@Injectable({
  providedIn: 'root'
})
export class TitlePipe implements PipeTransform {
  constructor(
    private translateService:TranslateService,
  ) {}

  transform(record, forms) {
    if (!record || !forms) {
      return '';
    }
    if (record.form) {
      return getFormName(record, forms);
    }
    if (record.kujua_message) {
      return this.translateService.instant('Outgoing Message');
    }
    return this.translateService.instant('sms_message.message');
  }
}

// @deprecated
@Pipe({
  name: 'clinic'
})
@Injectable({
  providedIn: 'root'
})
export class ClinicPipe implements PipeTransform {
  constructor(
    private formatProvider:FormatProvider,
  ) {}

  transform(entity) {
    console.warn('`clinic` filter is deprecated. Use `lineage` filter instead.');
    return this.formatProvider.lineage(entity);
  }
}

@Pipe({
  name: 'lineage'
})
@Injectable({
  providedIn: 'root'
})
export class LineagePipe implements PipeTransform {
  private userFacilityName: string | null = null;
  private isOnlineOnly = false;

  constructor(
    private formatProvider: FormatProvider,
    private sanitizer: DomSanitizer,
    private readonly store: Store,
  ) {
    this.store.select(Selectors.getIsOnlineOnly).subscribe(isOnlineOnly => {
      this.isOnlineOnly = isOnlineOnly;
    });
    this.store.select(Selectors.getUserFacilities).subscribe(facilities => {
      this.userFacilityName = facilities?.length === 1 ? facilities[0]?.name : null;
    });
  }

  transform(lineage) {
    const filtered = this.removeUserFacility(lineage);
    return this.sanitizer.bypassSecurityTrustHtml(this.formatProvider.lineage(filtered));
  }

  private removeUserFacility(lineage) {
    if (!this.shouldFilterLineage(lineage)) {
      return lineage;
    }

    lineage = lineage.filter(Boolean);
    if (lineage.length && this.getLastItem(lineage) === this.userFacilityName) {
      lineage.pop();
    }
    return lineage;
  }

  private shouldFilterLineage(lineage) {
    return !this.isOnlineOnly && this.userFacilityName && Array.isArray(lineage);
  }

  private getLastItem(lineage) {
    const lastItem = lineage[lineage.length - 1];
    return typeof lastItem === 'string' ? lastItem : lastItem?.name;
  }
}
