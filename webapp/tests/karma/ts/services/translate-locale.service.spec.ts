import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { TranslateLocaleService } from '@mm-services/translate-locale.service';

describe('TranslateLocaleService', () => {
  let translateService;
  let service;
  let translations;
  let compiledTranslations;

  beforeEach(() => {
    translateService = {
      translations: { },
      currentLoader: {
        getTranslation: sinon.stub(),
      },
      compiler: {
        compileTranslations: sinon.stub(),
      },
      addLangs: sinon.stub(),
      getParsedResult: sinon.stub(),
      resetLang: sinon.stub().callsFake(locale => {
        delete translateService.translations[locale];
      }),
      setTranslation: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateService },
      ]
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('instant', () => {
    it('should load a new locale', fakeAsync(async () => {
      translations = { item1: 'uncompiled1', item2: 'uncompiled2' };
      compiledTranslations = { item1: 'compiled1', item2: 'compiled2' };

      translateService.currentLoader.getTranslation.returns(of(translations));
      translateService.compiler.compileTranslations.returns(compiledTranslations);

      service = TestBed.inject(TranslateLocaleService);
      service.instant('item1', {}, 'new_locale');
      tick();

      expect(translateService.currentLoader.getTranslation.callCount).to.equal(1);
      expect(translateService.currentLoader.getTranslation.args[0]).to.deep.equal(['new_locale']);

      expect(translateService.compiler.compileTranslations.callCount).to.equal(1);
      expect(translateService.compiler.compileTranslations.args[0]).to.deep.equal([translations, 'new_locale']);

      expect(translateService.translations.new_locale).to.equal(compiledTranslations);
      expect(translateService.addLangs.callCount).to.equal(1);
      expect(translateService.addLangs.args[0]).to.deep.equal([['new_locale']]);

      service.instant('item2', {}, 'additional_locale');

      expect(translateService.currentLoader.getTranslation.callCount).to.equal(2);
      expect(translateService.currentLoader.getTranslation.args[1]).to.deep.equal(['additional_locale']);

      expect(translateService.compiler.compileTranslations.callCount).to.equal(2);
      expect(translateService.compiler.compileTranslations.args[1]).to.deep.equal([translations, 'additional_locale']);

      expect(translateService.translations.additional_locale).to.equal(compiledTranslations);
      expect(translateService.translations.new_locale).to.equal(compiledTranslations);
      expect(translateService.addLangs.callCount).to.equal(2);
      expect(translateService.addLangs.args[1]).to.deep.equal([['new_locale', 'additional_locale']]);
    }));

    it('should not load an already loading locale', fakeAsync(() => {
      translations = { item1: 'uncompiled1', item2: 'uncompiled2' };
      compiledTranslations = { item1: 'compiled1', item2: 'compiled2' };

      translateService.currentLoader.getTranslation.returns(new Observable(obs => {
        setTimeout(() => obs.next(translations), 1000);
      }));
      translateService.compiler.compileTranslations.returns(compiledTranslations);

      service = TestBed.inject(TranslateLocaleService);
      service.instant('item1', {}, 'new_locale');
      service.instant('item2', {}, 'new_locale');
      service.instant('item2', {}, 'new_locale');
      service.instant('item2', {}, 'new_locale');
      tick(1100);

      expect(translateService.currentLoader.getTranslation.callCount).to.equal(1);
      expect(translateService.currentLoader.getTranslation.args[0]).to.deep.equal(['new_locale']);

      expect(translateService.compiler.compileTranslations.callCount).to.equal(1);
      expect(translateService.compiler.compileTranslations.args[0]).to.deep.equal([translations, 'new_locale']);

      expect(translateService.translations.new_locale).to.equal(compiledTranslations);
      expect(translateService.addLangs.callCount).to.equal(1);
      expect(translateService.addLangs.args[0]).to.deep.equal([['new_locale']]);
    }));

    it('should not load an already loaded locale', fakeAsync(() => {
      translations = { item1: 'uncompiled1', item2: 'uncompiled2' };
      compiledTranslations = { item1: 'compiled1', item2: 'compiled2' };

      translateService.currentLoader.getTranslation.returns(of(translations));
      translateService.compiler.compileTranslations.returns(compiledTranslations);

      service = TestBed.inject(TranslateLocaleService);
      service.instant('item1', {}, 'new_locale');
      tick();

      service.instant('item1', {}, 'new_locale');
      service.instant('item1', {}, 'new_locale');
      service.instant('item1', {}, 'new_locale');
      tick();

      expect(translateService.currentLoader.getTranslation.callCount).to.equal(1);
      expect(translateService.compiler.compileTranslations.callCount).to.equal(1);
      expect(translateService.translations.new_locale).to.equal(compiledTranslations);
      expect(translateService.addLangs.callCount).to.equal(1);
      expect(translateService.addLangs.args[0]).to.deep.equal([['new_locale']]);
    }));

    it('should return non-parsed key from loaded locale', fakeAsync(() => {
      translations = { item1: 'uncompiled1', item2: 'uncompiled2' };
      compiledTranslations = { item1: 'compiled1', item2: 'compiled2' };
      translateService.currentLoader.getTranslation.returns(of(translations));
      translateService.compiler.compileTranslations.returns(compiledTranslations);

      service = TestBed.inject(TranslateLocaleService);
      service.instant('item1', {}, 'my_locale', true);
      tick();

      const result = service.instant('item1', {}, 'my_locale', true);
      expect(result).to.equal('compiled1');
      expect(translateService.getParsedResult.callCount).to.equal(0);
    }));

    it('should return parsed key from loaded locale ', fakeAsync(() => {
      translations = { item1: 'uncompiled1', item2: 'uncompiled2' };
      compiledTranslations = { item1: 'compiled1', item2: 'compiled2' };
      translateService.currentLoader.getTranslation.returns(of(translations));
      translateService.compiler.compileTranslations.returns(compiledTranslations);
      translateService.getParsedResult.callsFake((locale, key) => locale[key] + 'parsed');

      service = TestBed.inject(TranslateLocaleService);
      service.instant('item1', {}, 'new', true);
      tick();

      expect(service.instant('item1', {}, 'new')).to.equal('compiled1parsed');
      expect(service.instant('item2', {}, 'new')).to.equal('compiled2parsed');
    }));
  });

  describe('reloadLang', () => {
    it('should not reload locales that have not been loaded', fakeAsync(() => {
      service = TestBed.inject(TranslateLocaleService);
      service.reloadLang('new!');
      tick(); // make sure we don't end test too early before all potential microtasks are done

      expect(translateService.resetLang.callCount).to.equal(0);
      expect(translateService.setTranslation.callCount).to.equal(0);

      service.reloadLang('new!', true);
      tick(); // make sure we don't end test too early before all potential microtasks are done

      expect(translateService.resetLang.callCount).to.equal(0);
      expect(translateService.setTranslation.callCount).to.equal(0);
    }));

    it('should not hot reload locales', fakeAsync(() => {
      translateService.translations.existent_locale = { item: 'compiled' };
      translations = { item1: 'uncompiled1', item2: 'uncompiled2' };
      compiledTranslations = { item1: 'compiled1', item2: 'compiled2' };
      translateService.currentLoader.getTranslation.returns(of(translations));
      translateService.compiler.compileTranslations.returns(compiledTranslations);

      service = TestBed.inject(TranslateLocaleService);

      service.reloadLang('existent_locale');
      tick();

      expect(translateService.resetLang.callCount).to.equal(1);
      expect(translateService.resetLang.args[0]).to.deep.equal(['existent_locale']);

      expect(translateService.currentLoader.getTranslation.callCount).to.equal(1);
      expect(translateService.currentLoader.getTranslation.args[0]).to.deep.equal(['existent_locale']);

      expect(translateService.compiler.compileTranslations.callCount).to.equal(1);
      expect(translateService.compiler.compileTranslations.args[0]).to.deep.equal([translations, 'existent_locale']);

      expect(translateService.translations.existent_locale).to.equal(compiledTranslations);
      expect(translateService.addLangs.callCount).to.equal(1);
      expect(translateService.addLangs.args[0]).to.deep.equal([['existent_locale']]);

      expect(translateService.setTranslation.callCount).to.equal(0);
    }));

    it('should hot reload locales', fakeAsync(() => {
      translateService.translations.present = { item: 'compiled' };
      translations = { item1: 'uncompiled1', item2: 'uncompiled2' };
      translateService.currentLoader.getTranslation.returns(of(translations));

      service = TestBed.inject(TranslateLocaleService);

      service.reloadLang('present', true);
      tick();

      expect(translateService.resetLang.callCount).to.equal(0);
      expect(translateService.currentLoader.getTranslation.callCount).to.equal(1);
      expect(translateService.currentLoader.getTranslation.args[0]).to.deep.equal(['present']);

      expect(translateService.compiler.compileTranslations.callCount).to.equal(0);
      expect(translateService.setTranslation.callCount).to.equal(1);
      expect(translateService.setTranslation.args[0]).to.deep.equal(['present', translations]);
    }));
  });
});
