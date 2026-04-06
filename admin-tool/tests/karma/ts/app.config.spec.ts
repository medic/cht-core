import { APP_INITIALIZER } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpRequest } from '@angular/common/http';
import sinon from 'sinon';
import { expect } from 'chai';
import {
  appConfig,
  MissingTranslationHandlerLog,
  credentialsInterceptor,
  createTranslationLoader,
} from '../../../src/ts/app.config';
import { TranslationLoaderProvider } from '@admin-tool-providers/translation-loader.provider';

describe('appConfig', () => {
  it('should be defined', () => {
    expect(appConfig).to.exist;
  });

  it('should have a providers array', () => {
    expect(appConfig.providers).to.be.an('array');
  });

  it('should have at least one provider configured', () => {
    expect(appConfig.providers.length).to.be.greaterThan(0);
  });

  it('should include APP_INITIALIZER providers', () => {
    const initProviders = appConfig.providers.filter(
      (p: any) => p && p.provide === APP_INITIALIZER
    );
    expect(initProviders.length).to.be.greaterThanOrEqual(2);
  });

  describe('initSession factory', () => {
    it('should return a function that calls session.init', () => {
      const initProviders: any[] = appConfig.providers.filter(
        (p: any) => p && p.provide === APP_INITIALIZER
      );
      const sessionStub = { init: sinon.stub().resolves() };
      let called = false;
      for (const provider of initProviders) {
        try {
          const fn = provider.useFactory(sessionStub);
          if (typeof fn === 'function') {
            fn();
            if (sessionStub.init.callCount > 0) {
              called = true;
              break;
            }
          }
        } catch {
          // skip incompatible factories
        }
      }
      expect(called).to.be.true;
      sinon.restore();
    });
  });

  describe('initLanguage factory', () => {
    it('should call setDefaultLang and use with "en"', () => {
      const initProviders: any[] = appConfig.providers.filter(
        (p: any) => p && p.provide === APP_INITIALIZER
      );
      const translateStub = {
        setDefaultLang: sinon.stub(),
        use: sinon.stub().returns(undefined),
      } as unknown as TranslateService;

      let languageInitialized = false;
      for (const provider of initProviders) {
        try {
          const fn = provider.useFactory(translateStub);
          if (typeof fn === 'function') {
            fn();
            if ((translateStub.setDefaultLang as sinon.SinonStub).callCount > 0) {
              languageInitialized = true;
              break;
            }
          }
        } catch {
          // skip incompatible factories
        }
      }
      expect(languageInitialized).to.be.true;
      expect((translateStub.setDefaultLang as sinon.SinonStub).calledWith('en')).to.be.true;
      expect((translateStub.use as sinon.SinonStub).calledWith('en')).to.be.true;
      sinon.restore();
    });
  });

  describe('MissingTranslationHandlerLog', () => {
    it('should return the key when translation is missing', () => {
      const handler = new MissingTranslationHandlerLog();
      const result = handler.handle({ key: 'some.missing.key' } as any);
      expect(result).to.equal('some.missing.key');
    });
  });

  describe('credentialsInterceptor', () => {
    it('should clone request with withCredentials true', () => {
      const cloneStub = sinon.stub().returns({ cloned: true });
      const req = { clone: cloneStub } as unknown as HttpRequest<unknown>;
      const next = sinon.stub().returns('response');
      credentialsInterceptor(req, next as any);
      expect(cloneStub.calledWith({ withCredentials: true })).to.be.true;
      expect(next.calledOnce).to.be.true;
      sinon.restore();
    });
  });

  describe('createTranslationLoader', () => {
    it('should return a TranslationLoaderProvider instance', () => {
      const dbStub = {} as any;
      const loader = createTranslationLoader(dbStub);
      expect(loader).to.be.instanceOf(TranslationLoaderProvider);
    });
  });
});
