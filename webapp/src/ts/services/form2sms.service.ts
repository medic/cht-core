import * as odkForm2sms from 'odk-xform-compact-record-representation-for-sms'
import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { GetReportContentService } from '@mm-services/get-report-content.service';
import { ParseProvider } from '@mm-providers/parse.provider';

@Injectable({
  providedIn: 'root'
})
export class Form2smsService {
  constructor(
    private dbService:DbService,
    private getReportContentService:GetReportContentService,
    private parseProvider:ParseProvider,
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


  transform(doc) {
    if(!doc) {
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
          return this.parseProvider.parse(form.xml2sms)(context, { doc:doc.fields });
        } else {
          console.debug('Checking for standard odk tags in form submission...');
          return this.getReportContentService.getReportContent(doc).then(odkForm2sms);
        }
      })
      .catch((err) => {
        console.error('Form2Sms failed: ' + err);
        throw err;
      });
  }
}
