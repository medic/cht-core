import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { DbService } from '@admin-tool-services/db.service';
import { SettingsService } from '@admin-tool-services/settings.service';
import { LanguagesService } from '@admin-tool-services/languages.service';

describe('LanguagesService', () => {
  let service: LanguagesService;
  let dbService;
  let settingsService;

  const mockDocs = [
    {
      _id: 'messages-en',
      _rev: '1-abc',
      code: 'en',
      name: 'English',
      type: 'translations',
      generic: { Submit: 'Submit', Cancel: 'Cancel' },
      custom: { Clinic: 'Household' },
    },
    {
      _id: 'messages-es',
      _rev: '1-def',
      code: 'es',
      name: 'Español (Spanish)',
      type: 'translations',
      generic: { Submit: 'Enviar', Cancel: 'Cancelar' },
    },
  ];

  beforeEach(() => {
    dbService = {
      get: sinon.stub().returns({
        allDocs: sinon.stub().resolves({
          rows: mockDocs.map(doc => ({ doc })),
        }),
        put: sinon.stub().resolves(),
        remove: sinon.stub().resolves(),
      }),
    };

    settingsService = {
      get: sinon.stub().resolves({
        languages: [
          { locale: 'en', enabled: true },
          { locale: 'es', enabled: false },
        ],
      }),
      updateSettings: sinon.stub().resolves(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DbService, useValue: dbService },
        { provide: SettingsService, useValue: settingsService },
      ],
    });

    service = TestBed.inject(LanguagesService);
  });

  afterEach(() => sinon.restore());

  describe('getLanguages', () => {
    it('should call allDocs with correct params', async () => {
      await service.getLanguages();
      expect(dbService.get().allDocs.calledWith({
        startkey: 'messages-',
        endkey: 'messages-\ufff0',
        include_docs: true,
      })).to.be.true;
    });

    it('should call settingsService.get', async () => {
      await service.getLanguages();
      expect(settingsService.get.calledOnce).to.be.true;
    });

    it('should return a LanguageModel for each doc', async () => {
      const result = await service.getLanguages();
      expect(result).to.have.length(2);
    });

    it('should set enabled true when language is enabled in settings', async () => {
      const result = await service.getLanguages();
      const en = result.find(language => language.doc.code === 'en');
      expect(en!.enabled).to.be.true;
    });

    it('should set enabled false when language is disabled in settings', async () => {
      const result = await service.getLanguages();
      const es = result.find(language => language.doc.code === 'es');
      expect(es!.enabled).to.be.false;
    });

    it('should set enabled true when language is not in settings', async () => {
      settingsService.get.resolves({
        languages: [],
      });
      const result = await service.getLanguages();
      const en = result.find(language => language.doc.code === 'en');
      expect(en!.enabled).to.be.true;
    });

    it('should set enabled true when settings.languages is undefined', async () => {
      settingsService.get.resolves({});
      const result = await service.getLanguages();
      const en = result.find(language => language.doc.code === 'en');
      expect(en!.enabled).to.be.true;
    });

    it('should calculate missing translations for each language', async () => {
      const result = await service.getLanguages();
      result.forEach(language => {
        expect(language.missing).to.be.a('number');
      });
    });

    it('should handle error if allDocs fails', async () => {
      dbService.get().allDocs.rejects(new Error('error'));
      const result = service.getLanguages();
      await result.catch(err => expect(err.message).to.equal('error'));
    });

    it('should set enabled false when language is not in settings but other languages exist', async () => {
      settingsService.get.resolves({
        languages: [{ locale: 'fr', enabled: true }],
      });
      const result = await service.getLanguages();
      const en = result.find(language => language.doc.code === 'en');
      expect(en!.enabled).to.be.false;
    });
  });
  describe('countTotalTranslations', () => {
    it('should count unique keys across all docs', () => {
      const result = service['countTotalTranslations'](mockDocs as any);
      expect(result).to.equal(3);
    });

    it('should return 0 when docs array is empty', () => {
      const result = service['countTotalTranslations']([]);
      expect(result).to.equal(0);
    });
  });
  describe('countMissingTranslations', () => {
    it('should return correct number of missing translations', () => {
      const result = service['countMissingTranslations'](mockDocs[1] as any, 3);
      expect(result).to.equal(1);
    });

    it('should return 0 when doc has all translations', () => {
      const result = service['countMissingTranslations'](mockDocs[0] as any, 3);
      expect(result).to.equal(0);
    });

    it('should return total when doc has no translations', () => {
      const emptyDoc = { generic: {}, code: 'xx', name: 'Test', type: 'translations', _id: 'messages-xx' };
      const result = service['countMissingTranslations'](emptyDoc as any, 3);
      expect(result).to.equal(3);
    });
  });
  describe('saveLanguage', () => {
    it('should assign _id when doc has no _id', async () => {
      const doc = { code: 'fr', name: 'Français', type: 'translations', generic: {} } as any;
      await service.saveLanguage(doc);
      expect(doc._id).to.equal('messages-fr');
    });

    it('should not overwrite _id when doc already has _id', async () => {
      const doc = { _id: 'messages-fr', code: 'fr', name: 'Français', type: 'translations', generic: {} } as any;
      await service.saveLanguage(doc);
      expect(doc._id).to.equal('messages-fr');
    });

    it('should call db.get().put with the doc', async () => {
      const doc = { _id: 'messages-fr', code: 'fr', name: 'Français', type: 'translations', generic: {} } as any;
      await service.saveLanguage(doc);
      expect(dbService.get().put.calledWith(doc)).to.be.true;
    });

    it('should propagate error if put fails', async () => {
      dbService.get().put.rejects(new Error('error'));
      const doc = { _id: 'messages-fr', code: 'fr', name: 'Français', type: 'translations', generic: {} } as any;
      const result = service.saveLanguage(doc);
      await result.catch(err => expect(err.message).to.equal('error'));
    });
  });
  describe('deleteLanguage', () => {
    it('should call db.get().remove with the doc', async () => {
      const doc = {
        _id: 'messages-fr',
        _rev: '1-abc',
        code: 'fr',
        name: 'Français',
        type: 'translations',
        generic: {}
      } as any;
      await service.deleteLanguage(doc);
      expect(dbService.get().remove.calledWith(doc)).to.be.true;
    });

    it('should remove the language entry from settings after delete', async () => {
      const doc = mockDocs[0] as any;
      await service.deleteLanguage(doc);
      const languages = settingsService.updateSettings.args[0][0].languages;
      expect(languages.find(language => language.locale === 'en')).to.not.exist;
    });

    it('should keep other language entries in settings after delete', async () => {
      const doc = mockDocs[0] as any;
      await service.deleteLanguage(doc);
      const languages = settingsService.updateSettings.args[0][0].languages;
      expect(languages.find(language => language.locale === 'es')).to.exist;
    });

    it('should call updateSettings after remove', async () => {
      const doc = mockDocs[0] as any;
      await service.deleteLanguage(doc);
      expect(settingsService.updateSettings.calledOnce).to.be.true;
    });

    it('should propagate error if remove fails', async () => {
      dbService.get().remove.rejects(new Error('error'));
      const doc = mockDocs[0] as any;
      const result = service.deleteLanguage(doc);
      await result.catch(err => expect(err.message).to.equal('error'));
    });
  });
  describe('enableLanguage', () => {
    it('should handle empty settings.languages', async () => {
      settingsService.get.resolves({});
      const doc = { code: 'en' } as any;
      await service.enableLanguage(doc);
      const languages = settingsService.updateSettings.args[0][0].languages;
      expect(languages).to.have.length(1);
      expect(languages[0].locale).to.equal('en');
      expect(languages[0].enabled).to.be.true;
    });

    it('should call updateSettings with enabled true for existing language', async () => {
      const doc = { code: 'es' } as any;
      await service.enableLanguage(doc);
      const languages = settingsService.updateSettings.args[0][0].languages;
      const es = languages.find(language => language.locale === 'es');
      expect(es.enabled).to.be.true;
    });

    it('should create new entry if language not in settings', async () => {
      const doc = { code: 'fr' } as any;
      await service.enableLanguage(doc);
      const languages = settingsService.updateSettings.args[0][0].languages;
      const fr = languages.find(language => language.locale === 'fr');
      expect(fr).to.exist;
      expect(fr.enabled).to.be.true;
    });

    it('should call updateSettings without replace', async () => {
      const doc = { code: 'en' } as any;
      await service.enableLanguage(doc);
      expect(settingsService.updateSettings.calledOnce).to.be.true;
      expect(settingsService.updateSettings.args[0][1]).to.be.undefined;
    });

    it('should propagate error if updateSettings fails', async () => {
      settingsService.updateSettings.rejects(new Error('error'));
      const doc = { code: 'en' } as any;
      const result = service.enableLanguage(doc);
      await result.catch(err => expect(err.message).to.equal('error'));
    });
  });
  describe('disableLanguage', () => {
    it('should handle empty settings.languages', async () => {
      settingsService.get.resolves({});
      const doc = { code: 'en' } as any;
      await service.disableLanguage(doc);
      const languages = settingsService.updateSettings.args[0][0].languages;
      expect(languages).to.have.length(1);
      expect(languages[0].locale).to.equal('en');
      expect(languages[0].enabled).to.be.false;
    });

    it('should call updateSettings with enabled false for existing language', async () => {
      const doc = { code: 'en' } as any;
      await service.disableLanguage(doc);
      const languages = settingsService.updateSettings.args[0][0].languages;
      const en = languages.find(language => language.locale === 'en');
      expect(en.enabled).to.be.false;
    });

    it('should create new entry if language not in settings', async () => {
      const doc = { code: 'fr' } as any;
      await service.disableLanguage(doc);
      const languages = settingsService.updateSettings.args[0][0].languages;
      const fr = languages.find(language => language.locale === 'fr');
      expect(fr).to.exist;
      expect(fr.enabled).to.be.false;
    });

    it('should propagate error if updateSettings fails', async () => {
      settingsService.updateSettings.rejects(new Error('error'));
      const doc = { code: 'en' } as any;
      const result = service.disableLanguage(doc);
      await result.catch(err => expect(err.message).to.equal('error'));
    });
  });
  describe('importLanguage', () => {
    it('should not call put if nothing changed', async () => {
      const doc = {
        _id: 'messages-en',
        _rev: '1-abc',
        code: 'en',
        name: 'English',
        type: 'translations',
        generic: { Submit: 'Submit' },
        custom: { Clinic: 'Household' },
      } as any;
      await service.importLanguage(doc, { Submit: 'Submit', Clinic: 'Household' });
      expect(dbService.get().put.called).to.be.false;
    });

    it('should delete key from custom when imported value matches generic', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: { Submit: 'Submit' },
        custom: { Submit: 'Submit' },
      } as any;
      await service.importLanguage(doc, { Submit: 'Submit' });
      const putDoc = dbService.get().put.args[0][0];
      expect(putDoc.custom.Submit).to.be.undefined;
      expect(dbService.get().put.calledOnce).to.be.true;
    });

    it('should not delete key from custom when imported value differs from generic', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: { Submit: 'Submit' },
        custom: { Submit: 'Enviar' },
      } as any;
      await service.importLanguage(doc, { Submit: 'Guardar' });
      const putDoc = dbService.get().put.args[0][0];
      expect(putDoc.custom.Submit).to.equal('Guardar');
      expect(dbService.get().put.calledOnce).to.be.true;
    });

    it('should not update custom when imported value equals existing custom', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: { Submit: 'Submit' },
        custom: { Submit: 'Enviar' },
      } as any;
      await service.importLanguage(doc, { Submit: 'Enviar' });
      expect(dbService.get().put.called).to.be.false;
    });

    it('should add to custom when key exists in generic but not in custom', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: { Submit: 'Submit' },
        custom: {},
      } as any;
      await service.importLanguage(doc, { Submit: 'Enviar' });
      const putDoc = dbService.get().put.args[0][0];
      expect(putDoc.custom.Submit).to.equal('Enviar');
      expect(dbService.get().put.calledOnce).to.be.true;
    });

    it('should update custom when key not in generic and imported value differs', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: {},
        custom: { Clinic: 'Household' },
      } as any;
      await service.importLanguage(doc, { Clinic: 'Clinic updated' });
      const putDoc = dbService.get().put.args[0][0];
      expect(putDoc.custom.Clinic).to.equal('Clinic updated');
      expect(dbService.get().put.calledOnce).to.be.true;
    });

    it('should not update custom when key not in generic and imported value equals custom', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: {},
        custom: { Clinic: 'Household' },
      } as any;
      await service.importLanguage(doc, { Clinic: 'Household' });
      expect(dbService.get().put.called).to.be.false;
    });

    it('should add to custom when key does not exist in generic or custom', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: {},
        custom: {},
      } as any;
      await service.importLanguage(doc, { NewKey: 'New Value' });
      const putDoc = dbService.get().put.args[0][0];
      expect(putDoc.custom.NewKey).to.equal('New Value');
      expect(dbService.get().put.calledOnce).to.be.true;
    });

    it('should create custom object if undefined when adding new key', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: {},
      } as any;
      await service.importLanguage(doc, { NewKey: 'New Value' });
      const putDoc = dbService.get().put.args[0][0];
      expect(putDoc.custom).to.exist;
      expect(putDoc.custom.NewKey).to.equal('New Value');
    });

    it('should call put with a copy of the doc', async () => {
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: {},
        custom: {},
      } as any;
      await service.importLanguage(doc, { NewKey: 'New Value' });
      const putDoc = dbService.get().put.args[0][0];
      expect(putDoc).to.not.equal(doc);
      expect(putDoc._id).to.equal(doc._id);
    });

    it('should propagate error if put fails', async () => {
      dbService.get().put.rejects(new Error('error'));
      const doc = {
        _id: 'messages-en', _rev: '1-abc', code: 'en', name: 'English', type: 'translations',
        generic: {},
        custom: {},
      } as any;
      const result = service.importLanguage(doc, { NewKey: 'New Value' });
      await result.catch(err => expect(err.message).to.equal('error'));
    });
  });
});
