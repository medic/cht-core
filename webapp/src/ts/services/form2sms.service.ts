import * as odkForm2sms from 'odk-xform-compact-record-representation-for-sms';
import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { GetReportContentService } from '@mm-services/get-report-content.service';
import { ParseProvider } from '@mm-providers/parse.provider';
import { FileReaderService } from '@mm-services/file-reader.service';
import { EnketoPrepopulationDataService } from '@mm-services/enketo-prepopulation-data.service';
import { UserSettingsService } from '@mm-services/user-settings.service';

@Injectable({
  providedIn: 'root'
})
export class Form2smsService {
  constructor(
    private dbService:DbService,
    private getReportContentService:GetReportContentService,
    private fileReaderService: FileReaderService,
    private parseProvider:ParseProvider,
    private enketoPrepopulationDataService: EnketoPrepopulationDataService,
    private userSettingsService:UserSettingsService,
  ) {
  }

  private concat(...args) {
    return args.join('');
  }

  private spaced(...args) {
    return args.join(' ');
  }

  private match(val, matchers) {
    const matchMap = {};
    matchers
      .split(',')
      .map(it => it.trim())
      .forEach(it => {
        const [ k, v ] = it.split(':');
        matchMap[k] = v;
      });
    return matchMap[val] || '';
  }

  private getFormModel(form) {
    return this.dbService
      .get()
      .getAttachment(form, 'model')
      .then(blob => this.fileReaderService.utf8(blob));
  }

  private getReportXml(form, doc) {
    return Promise
      .all([
        this.getReportContentService.getReportContent(doc),
        this.getFormModel(form),
        this.userSettingsService.getWithLanguage()
      ])
      .then(([reportModel, formModel, userSettings]) => {
        return this.enketoPrepopulationDataService.get(userSettings, formModel, reportModel);
      });
  }

  transform(doc) {
    if (!doc) {
      return Promise.reject(new Error('No doc provided.'));
    }

    return this.dbService
      .get()
      .get(`form:${doc.form}`)
      .then(form => {
        if (!form.xml2sms) {
          console.debug('Not sending SMS. `xml2sms` form property not defined or falsy.');
          return;
        }

        const context = {
          concat: this.concat,
          spaced: this.spaced,
          match: this.match,
        };

        if (typeof form.xml2sms === 'string') {
          return this.parseProvider.parse(form.xml2sms)(context, { doc: doc.fields });
        } else {
          console.debug('Checking for standard odk tags in form submission...');
          return this.getReportXml(doc.form, doc).then(odkForm2sms);
        }
      })
      .catch((err) => {
        console.error('Form2Sms failed: ' + err);
        throw err;
      });
  }
}
