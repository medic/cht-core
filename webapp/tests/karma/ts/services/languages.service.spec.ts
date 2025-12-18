import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SettingsService } from '@mm-services/settings.service';
import { LanguagesService } from '@mm-services/languages.service';
import {DbService} from '@mm-services/db.service';
import { DOC_TYPES } from '@medic/constants';

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
          key: [DOC_TYPES.TRANSLATIONS],
          doc: {
            _id: 'messages-es',
            code: 'es',
            name: 'Español (Spanish)',
            generic: {},
            custom: {},
          }
        },
        {
          id: 'messages-en',
          key: [DOC_TYPES.TRANSLATIONS],
          doc: {
            _id: 'messages-en',
            code: 'en',
            name: 'English',
            generic: {},
            custom: {},
          }
        },
        {
          id: 'messages-fr',
          key: [DOC_TYPES.TRANSLATIONS],
          doc: {
            _id: 'messages-fe',
            code: 'fr',
            name: 'Français (French)',
            generic: {},
            custom: {},
          },
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
    it('should return all translations', async () => {
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
