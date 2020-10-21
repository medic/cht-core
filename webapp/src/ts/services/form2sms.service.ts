import * as odkForm2sms from 'odk-xform-compact-record-representation-for-sms'
import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { GetReportContentService } from '@mm-services/get-report-content.service';

@Injectable({
  providedIn: 'root'
})
export class Form2smsService {
  constructor(
    private dbService:DbService,
    private getReportContentService:GetReportContentService,
    private parseProvider:ParsePro
  ) {
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
          $log.debug('Not sending SMS. `xml2sms` form property not defined or falsy.');
          return;
        }

        if (typeof form.xml2sms === 'string') {
          return $parse(form.xml2sms)({ doc:doc.fields, concat, spaced, match });
        } else {
          $log.debug('Checking for standard odk tags in form submission...');
          return GetReportContent(doc).then(odkForm2sms);
        }
      })
      .catch(function(err) {
        $log.error('Form2Sms failed: ' + err);
        throw err;
      });
  }
}

/*

angular
  .module('inboxServices')
  .service('Form2Sms', function(
    $log,
    $parse,
    $q,
    DB,
    GetReportContent
  ) {
    'use strict';
    'ngInject';

    return function(doc) {

    };
  });

const concat = (...args) => args.join('');
const spaced = (...args) => args.join(' ');

function match(val, matchers) {
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
*/
