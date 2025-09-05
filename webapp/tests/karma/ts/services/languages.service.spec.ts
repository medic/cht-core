import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SettingsService } from '@mm-services/settings.service';
import { LanguagesService } from '@mm-services/languages.service';
import {DbService} from '@mm-services/db.service';

describe('Languages service', () => {
  afterEach(() => {
    sinon.restore();
  });

  let settingsService;
  let dbQuery;
  let languagesService: LanguagesService;

  beforeEach(() => {
    settingsService = { get: sinon.stub() };
    dbQuery = sinon.stub();

    dbQuery.resolves({
      rows: [
        {
          id: 'messages-es',
          key: ['translations', false],
          value: {
            code: 'es',
            name: 'Español (Spanish)'
          }
        },
        {
          id: 'messages-en',
          key: ['translations', true],
          value: {
            code: 'en',
            name: 'English'
          }
        },
        {
          id: 'messages-fr',
          key: ['translations', true],
          value: {
            code: 'fr',
            name: 'Français (French)'
          }
        },
      ],
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: settingsService },
        { provide: DbService, useValue: { get: () => ({ query: dbQuery })  } },
      ]
    });
    languagesService = TestBed.inject(LanguagesService);
  });

  describe('with new "languages" setting', () => {
    it('should only return translation docs enabled in "languages" setting', async () => {
      settingsService.get.resolves({
        languages: [
          { locale: 'en', enabled: true },
          { locale: 'fr', enabled: true },
          { locale: 'es', enabled: false },
        ],
      });
      const enabledLocales = await languagesService.get();
      expect(enabledLocales).to.deep.equal([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Français (French)' },
      ]);
    });
  });

  describe('without new "languages" setting', () => {
    it('should only return translation docs enabled in translation doc', async () => {
      settingsService.get.resolves({});
      const enabledLocales = await languagesService.get();
      expect(enabledLocales).to.deep.equal([
        { code: 'es', name: 'Español (Spanish)' },
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Français (French)' },
      ]);
    });
  });
});
