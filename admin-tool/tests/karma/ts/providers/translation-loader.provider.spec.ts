import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { firstValueFrom } from 'rxjs';

import { TranslationLoaderProvider } from '@admin-tool-providers/translation-loader.provider';
import { DbService } from '@admin-tool-services/db.service';

describe('TranslationLoaderProvider', () => {
  let provider: TranslationLoaderProvider;
  let dbService;
  let dbGet;

  beforeEach(() => {
    dbGet = sinon.stub();
    dbService = { get: sinon.stub().returns({ get: dbGet }) };

    TestBed.configureTestingModule({
      providers: [
        TranslationLoaderProvider,
        { provide: DbService, useValue: dbService },
      ],
    });

    provider = TestBed.inject(TranslationLoaderProvider);
  });

  afterEach(() => sinon.restore());

  describe('getTranslation', () => {
    it('should return undefined for empty locale', () => {
      const result = provider.getTranslation('');
      expect(result).to.be.undefined;
    });

    it('should fetch the correct doc ID for a locale', async () => {
      dbGet.resolves({ generic: {}, custom: {} });
      await firstValueFrom(provider.getTranslation('en'));
      expect(dbGet.calledOnce).to.be.true;
      expect(dbGet.calledWith('messages-en')).to.be.true;
    });

    it('should merge generic and custom translations', async () => {
      dbGet.resolves({
        generic: { key1: 'generic value' },
        custom: { key2: 'custom value' },
      });
      const result = await firstValueFrom(provider.getTranslation('en'));
      expect(result).to.deep.include({ key1: 'generic value', key2: 'custom value' });
    });

    it('should let custom translations override generic ones', async () => {
      dbGet.resolves({
        generic: { key1: 'generic' },
        custom: { key1: 'custom' },
      });
      const result = await firstValueFrom(provider.getTranslation('en')) as Record<string, string>;
      expect(result['key1']).to.equal('custom');
    });

    it('should handle missing generic section', async () => {
      dbGet.resolves({ custom: { key1: 'val' } });
      const result = await firstValueFrom(provider.getTranslation('en'));
      expect(result).to.deep.include({ key1: 'val' });
    });

    it('should handle missing custom section', async () => {
      dbGet.resolves({ generic: { key1: 'val' } });
      const result = await firstValueFrom(provider.getTranslation('en'));
      expect(result).to.deep.include({ key1: 'val' });
    });

    it('should return empty object on 401 error', async () => {
      dbGet.rejects({ status: 401 });
      const result = await firstValueFrom(provider.getTranslation('en'));
      expect(result).to.deep.equal({});
    });

    it('should return empty object on 404 error', async () => {
      dbGet.rejects({ status: 404 });
      const result = await firstValueFrom(provider.getTranslation('en'));
      expect(result).to.deep.equal({});
    });

    it('should rethrow errors with status other than 401/404', async () => {
      dbGet.rejects({ status: 500 });
      let error;
      try {
        await firstValueFrom(provider.getTranslation('en'));
      } catch (err) {
        error = err;
      }
      expect(error).to.exist;
      expect(error.status).to.equal(500);
    });

    it('should reuse in-flight promise for duplicate locale calls', () => {
      dbGet.resolves({ generic: {}, custom: {} });
      provider.getTranslation('en');
      provider.getTranslation('en');
      expect(dbGet.callCount).to.equal(1);
    });

    it('should clean up loading promise after completion', async () => {
      dbGet.resolves({ generic: {}, custom: {} });
      await firstValueFrom(provider.getTranslation('en'));
      // After completion a new call should trigger a fresh fetch
      dbGet.resolves({ generic: { newKey: 'newVal' }, custom: {} });
      await firstValueFrom(provider.getTranslation('en'));
      expect(dbGet.callCount).to.equal(2);
    });
  });
});
