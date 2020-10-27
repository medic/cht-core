import { Injectable, Pipe, PipeTransform } from '@angular/core';
import * as _ from 'lodash-es';
import { TranslateService } from '@ngx-translate/core';
import { FormatProvider } from '../providers/format.provider';
import { DomSanitizer } from '@angular/platform-browser';

const getFormName = (record, forms) => {
  const form = _.find(forms, { code: record.form });
  if (form) {
    return form.title;
  }
  return record.form;
}

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
    private translateService:TranslateService,
    private formatProvider:FormatProvider,
  ) {}

  transform(entity) {
    console.warn('`clinic` filter is deprecated. Use `lineage` filter instead.');
    return this.formatProvider.lineage(entity);
  };
}

@Pipe({
  name: 'lineage'
})
@Injectable({
  providedIn: 'root'
})
export class LineagePipe implements PipeTransform {
  constructor(
    private translateService:TranslateService,
    private formatProvider:FormatProvider,
    private sanitizer:DomSanitizer,
  ) {}

  transform(entity) {
    return this.sanitizer.bypassSecurityTrustHtml(this.formatProvider.lineage(entity));
  };
}
