import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import { TranslateService } from '@ngx-translate/core';

import { TranslateFromService } from '@mm-services/translate-from.service';

// this code exists in app.module, which apparently isn't loaded in individual tests
import * as _ from 'lodash-es';
_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;

describe('TranslateFrom Service', () => {
  let service:TranslateFromService;
  let translateService;
  let currentLang;

  beforeEach(() => {
    currentLang = 'en';
    translateService = {
      get currentLang() {
        return currentLang;
      },
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateService }
      ],
    });
    service = TestBed.inject(TranslateFromService);
  });

  it('should return nothing when no labels', () => {
    expect(service.get(false)).to.equal(undefined);
    expect(service.get([])).to.equal(undefined);
  });

  it('should return label from Array format', () => {
    const labels = [
      { content: 'hello-es', locale: 'es' },
      { content: 'hello-fr', locale: 'fr' },
      { content: 'hello-en', locale: 'en' },
    ];
    expect(service.get(labels)).to.equal('hello-en');
    currentLang = 'fr';
    expect(service.get(labels)).to.equal('hello-fr');
    currentLang = 'nl'; // language doesn't exist
    expect(service.get(labels)).to.equal('hello-es'); // returns 1st
  });

  it('should return label from Object format', () => {
    const labels = {
      ne: 'hello-ne',
      en: 'hello-en',
      fr: 'hello-fr',
      es: 'hello-es',
    };
    expect(service.get(labels)).to.equal('hello-en');
    currentLang = 'fr';
    expect(service.get(labels)).to.equal('hello-fr');
    currentLang = 'nl'; // language doesn't exist
    expect(service.get(labels)).to.equal('hello-ne'); // return 1st
  });

  it('should work with scope', () => {
    const scope = {
      personA: 'mary',
      personB: 'jacob'
    };
    const labels = { en: '{{personA}} goes to meet {{personB}}' };
    expect(service.get(labels, scope)).to.equal('mary goes to meet jacob');
  });

  it('should work with a string label', () => {
    expect(service.get('whatever')).to.equal('whatever');
  });

  // I doubt this can ever happen, but I am going for 100% coverage :D
  it('should work with no current lang', () => {
    currentLang = false;
    expect(service.get({ en: 'whatever' })).to.equal('whatever');
  });
});
