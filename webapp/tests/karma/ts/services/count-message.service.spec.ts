import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import { TranslateFakeLoader, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import sinon from 'sinon';

import { CountMessageService } from '@mm-services/count-message.service';
import { SettingsService } from '@mm-services/settings.service';

describe('CountMessageService', () => {
  let service: CountMessageService;
  let settingsService;
  let translateService;
  const generateString = (len) => {
    return Array(len + 1).join('m');
  };
  
  beforeEach(() => {
    settingsService = {
      get: sinon.stub().resolves({})
    };
    translateService = {
      instant: (key, count) => `${key}|${JSON.stringify(count)}`
    };
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
      ],
      providers: [
        { provide: TranslateService, useValue: translateService },
        { provide: SettingsService, useValue: settingsService }
      ]
    });
    service = TestBed.inject(CountMessageService);
    settingsService = TestBed.inject(SettingsService);
  });

  it('should be created', () => {
    expect(service).to.exist;
  });

  it('generates correct message when no val', () => {
    const actual = service.label('', false);

    expect(actual).to.equal('message.characters.left|{"messages":0,"characters":160}');
  });

  it('generates correct message when single sms', () => {
    const actual = service.label(generateString(101), true);

    expect(actual).to.equal('message.characters.left|{"messages":1,"characters":59}');
  });

  it('generates correct message when multiple sms', () => {
    const actual = service.label(generateString(190), false);

    expect(actual).to.equal('message.characters.left.multiple|{"messages":2,"characters":130}');
  });

  it('generates correct message when non gsm characters', () => {
    const actual = service.label('hello😀', false);

    expect(actual).to.equal('message.characters.left|{"messages":1,"characters":63}');
  });

});
