import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateFromPipe } from '@admin-tool-modules/forms/translate-from.pipe';

describe('TranslateFromPipe', () => {
  let pipe: TranslateFromPipe;
  let translateService: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
    });
    translateService = TestBed.inject(TranslateService);
    translateService.use('en');
    pipe = new TranslateFromPipe(translateService);
  });

  describe('null/undefined input', () => {
    it('should return undefined if labels is null', () => {
      expect(pipe.transform(null)).to.be.undefined;
    });

    it('should return undefined if labels is undefined', () => {
      expect(pipe.transform(undefined)).to.be.undefined;
    });
  });
  describe('array format', () => {
    it('should return content for matching locale', () => {
      const labels = [
        { locale: 'en', content: 'Delivery registration' },
        { locale: 'ne', content: 'सुलेकरी विवरण फारम' },
      ];
      expect(pipe.transform(labels)).to.equal('Delivery registration');
    });

    it('should return first content as fallback when locale does not match', () => {
      translateService.use('fr');
      pipe = new TranslateFromPipe(translateService);
      const labels = [
        { locale: 'en', content: 'Delivery registration' },
        { locale: 'ne', content: 'सुलेकरी विवरण फारम' },
      ];
      expect(pipe.transform(labels)).to.equal('Delivery registration');
    });

    it('should return undefined if array is empty', () => {
      expect(pipe.transform([])).to.be.undefined;
    });
  });
  describe('object format', () => {
    it('should return value for matching locale', () => {
      const labels = { en: 'Hello', fr: 'Bonjour' };
      expect(pipe.transform(labels)).to.equal('Hello');
    });

    it('should return first value as fallback when locale does not match', () => {
      translateService.use('de');
      pipe = new TranslateFromPipe(translateService);
      const labels = { en: 'Hello', fr: 'Bonjour' };
      expect(pipe.transform(labels)).to.equal('Hello');
    });
  });
  describe('string format', () => {
    it('should return the string as-is', () => {
      expect(pipe.transform('Death report')).to.equal('Death report');
    });

    it('should return empty string as-is', () => {
      expect(pipe.transform('')).to.be.undefined;
    });
  });
});
