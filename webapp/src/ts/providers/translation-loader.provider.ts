const translationUtils = require('@medic/translation-utils');
const DOC_ID_PREFIX = 'messages-';


import { Injectable } from "@angular/core";
import { TranslateLoader } from "@ngx-translate/core";
import { from } from 'rxjs';

import { Db } from "../services/db.service";


@Injectable()
export class TranslationLoaderProvider implements TranslateLoader {
  constructor(private db:Db) {}

  getTranslation(locale) {
    const promise =  this.db.get()
      .get(DOC_ID_PREFIX + locale)
      .then(doc => {
        const values = Object.assign(doc.generic || {}, doc.custom || {});
        return translationUtils.loadTranslations(values);
      })
      .catch(function(err) {
        if (err.status !== 404) {
          throw err;
        }
        return {};
      });
    return from(promise);
  };
}
/*
angular.module('inboxServices').factory('TranslationLoader',
  function(
    $q,
    DB,
    Settings
  ) {
    'use strict';
    'ngInject';

    const getLocale = function(options) {
      if (options.key) {
        return $q.resolve(options.key);
      }
      return Settings().then(function(settings) {
        return settings.locale || DEFAULT_LOCALE;
      });
    };

    const mapTesting = function(doc) {
      Object.keys(doc).forEach(function(key) {
        doc[key] = '-' + doc[key] + '-';
      });
    };

    const service = (options) => {
      let testing = false;
      if (options.key === 'test') {
        options.key = 'en';
        testing = true;
      }
      return getLocale(options)
        .then(function(locale) {
          return DB().get(DOC_ID_PREFIX + locale);
        })
        .then(function(doc) {

        })
        .catch(function(err) {
          if (err.status !== 404) {
            throw err;
          }
          return {};
        });
    };

    const re = new RegExp(`^${DOC_ID_PREFIX}([a-zA-Z]+)$`);
    service.test = docId => docId && re.test(docId);
    service.getCode = docId => {
      if (!docId) {
        return false;
      }
      const match = docId.toString().match(re);
      return match && match[1];
    };

    return service;
  }
);*/
