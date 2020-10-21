import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { TranslationLoaderService } from '@mm-services/translation-loader.service';
import { SettingsService } from '@mm-services/settings.service';

describe('TranslationsLoader service', () => {
  let service:TranslationLoaderService;
  let settings;

  beforeEach(() => {
    settings = { get: sinon.stub() };

    TestBed.configureTestingModule({ providers: [{ provide: SettingsService, useValue: settings }] });
    service = TestBed.inject(TranslationLoaderService);
  })

  describe('getLocale', () => {
    it('returns settings default', () => {
      settings.get.resolves({ locale: 'us' });

      return service.getLocale().then(locale => {
        expect(locale).to.equal('us');
        expect(settings.get.callCount).to.equal(1);
      });
    });

    it('defaults to "en"', function() {
      settings.get.resolves({ });

      return service.getLocale().then(locale => {
        expect(locale).to.equal('en');
        expect(settings.get.callCount).to.equal(1);
      });
    });
  });

  describe('test method', () => {
    it('should return false when not matching', () => {
      expect(service.test()).to.equal(undefined);
      expect(service.test([])).to.equal(false);
      expect(service.test({})).to.equal(false);
      expect(service.test(100)).to.equal(false);
      expect(service.test('04aa1bfa-f87d-467e-bf46-51eeb367370b')).to.equal(false);
      expect(service.test('messages-')).to.equal(false);
    });

    it('should return true when matching', () => {
      expect(service.test('messages-en')).to.equal(true);
      expect(service.test('messages-fr')).to.equal(true);
      expect(service.test('messages-any')).to.equal(true);
    });
  });

  describe('getCode', () => {
    it('should return false when not matching', () => {
      expect(service.getCode()).to.equal(false);
      expect(service.getCode([])).to.equal(null);
      expect(service.getCode({})).to.equal(null);
      expect(service.getCode(100)).to.equal(null);
      expect(service.getCode('04aa1bfa-f87d-467e-bf46-51eeb367370b')).to.equal(null);
      expect(service.getCode('messages-')).to.equal(null);
    });

    it('should return code when matching', () => {
      expect(service.getCode('messages-en')).to.equal('en');
      expect(service.getCode('messages-fr')).to.equal('fr');
      expect(service.getCode('messages-any')).to.equal('any');
    });
  });
});
