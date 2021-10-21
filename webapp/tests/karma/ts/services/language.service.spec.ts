import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { TranslateService as NgxTranslateService } from '@ngx-translate/core';
import * as moment from 'moment';

import { SettingsService } from '@mm-services/settings.service';
import { CookieService } from 'ngx-cookie-service';
import { LanguageService, LanguageCookieService, SetLanguageService } from '@mm-services/language.service';
import { FormatDateService } from '@mm-services/format-date.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('Language services', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('LanguageCookieService', () => {
    let cookieService;
    let languageCookieService:LanguageCookieService;

    beforeEach(() => {
      cookieService = { get: sinon.stub(), set: sinon.stub() };

      TestBed.configureTestingModule({
        providers: [
          { provide: CookieService, useValue: cookieService },
        ]
      });
      languageCookieService = TestBed.inject(LanguageCookieService);
    });

    it('should get language from cookie and cache result', () => {
      const currentLocale = 'current_language';
      cookieService.get.returns(currentLocale);
      expect(languageCookieService.get()).to.equal(currentLocale);
      expect(cookieService.get.callCount).to.deep.equal(1);
      expect(cookieService.get.args[0]).to.deep.equal(['locale']);

      expect(languageCookieService.get()).to.equal(currentLocale);
      expect(cookieService.get.callCount).to.deep.equal(1);
      expect(languageCookieService.get()).to.equal(currentLocale);
      expect(languageCookieService.get()).to.equal(currentLocale);
      expect(languageCookieService.get()).to.equal(currentLocale);
      expect(cookieService.get.callCount).to.deep.equal(1);
    });

    it('should set cookie language and cache result', () => {
      const newLocale = 'somelanguage';
      expect(languageCookieService.set(newLocale)).to.equal(newLocale);
      expect(cookieService.set.callCount).to.equal(1);
      expect(cookieService.set.args[0]).to.deep.equal(['locale', newLocale, 365, '/']);

      expect(languageCookieService.get()).to.equal(newLocale);
      expect(cookieService.get.callCount).to.equal(0);
    });
  });

  describe('SetLanguageService', () => {
    let languageCookieService;
    let ngxTranslateService;
    let formatDateService;
    let telemetryService;
    let setLanguageService:SetLanguageService;

    beforeEach(() => {
      (<any>$.fn).datepicker = {
        dates: { en: {}, es: {}, fr: {}, nl: {} },
        defaults: { language: 'en' },
      };

      sinon.stub(moment, 'locale');
      languageCookieService = { set: sinon.stub(), get: sinon.stub() };
      ngxTranslateService = {
        use: sinon.stub().returns({ toPromise: sinon.stub().resolves() }),
      };
      formatDateService = { init: sinon.stub().resolves() };
      telemetryService = { record: sinon.stub() };

      TestBed.configureTestingModule({
        providers: [
          { provide: LanguageCookieService, useValue: languageCookieService },
          { provide: NgxTranslateService, useValue: ngxTranslateService },
          { provide: FormatDateService, useValue: formatDateService },
          { provide: TelemetryService, useValue: telemetryService },
        ]
      });
      setLanguageService = TestBed.inject(SetLanguageService);
    });

    it('should set language across services', async () => {
      const newLocale = 'new locale';
      await setLanguageService.set(newLocale);

      expect((<any>moment.locale).callCount).to.equal(1);
      expect((<any>moment.locale).args[0]).to.deep.equal([[newLocale, 'en']]);
      expect(ngxTranslateService.use.callCount).to.equal(1);
      expect(ngxTranslateService.use.args[0]).to.deep.equal([newLocale]);
      expect(languageCookieService.set.callCount).to.equal(1);
      expect(languageCookieService.set.args[0]).to.deep.equal([newLocale]);
      expect(formatDateService.init.callCount).to.equal(1);

      expect((<any>$.fn).datepicker.defaults.language).to.equal('en');
      expect(telemetryService.record.callCount).to.equal(1);
      expect(telemetryService.record.args[0]).to.deep.equal(['user_settings:language:new locale']);
    });

    it('should set supported datepicker language', async () => {
      const newLocale = 'nl';
      await setLanguageService.set(newLocale);

      expect((<any>moment.locale).callCount).to.equal(1);
      expect((<any>moment.locale).args[0]).to.deep.equal([[newLocale, 'en']]);
      expect(ngxTranslateService.use.callCount).to.equal(1);
      expect(ngxTranslateService.use.args[0]).to.deep.equal([newLocale]);
      expect(languageCookieService.set.callCount).to.equal(1);
      expect(languageCookieService.set.args[0]).to.deep.equal([newLocale]);
      expect(formatDateService.init.callCount).to.equal(1);

      expect((<any>$.fn).datepicker.defaults.language).to.equal('nl');
    });

    it('should skip setting cookie if false param is passed', async () => {
      const newLocale = 'other locale';
      await setLanguageService.set(newLocale, false);

      expect((<any>moment.locale).callCount).to.equal(1);
      expect((<any>moment.locale).args[0]).to.deep.equal([[newLocale, 'en']]);
      expect(ngxTranslateService.use.callCount).to.equal(1);
      expect(ngxTranslateService.use.args[0]).to.deep.equal([newLocale]);
      expect(languageCookieService.set.callCount).to.equal(0);
      expect(formatDateService.init.callCount).to.equal(1);
    });
  });

  describe('LanguageService', () => {
    let languageCookieService;
    let settingsService;
    let languageService:LanguageService;

    beforeEach(() => {
      settingsService = { get: sinon.stub() };
      languageCookieService = { get: sinon.stub(), set: sinon.stub() };

      TestBed.configureTestingModule({
        providers: [
          { provide: SettingsService, useValue: settingsService },
          { provide: LanguageCookieService, useValue: languageCookieService },
        ]
      });
      languageService = TestBed.inject(LanguageService);
    });

    describe('get', () => {
      it('should return cookie value if already set', async () => {
        const locale = 'the locale';
        languageCookieService.get.returns(locale);

        expect(await languageService.get()).to.equal(locale);
        expect(languageCookieService.get.callCount).to.equal(1);
        expect(settingsService.get.callCount).to.equal(0);
        expect(languageCookieService.set.callCount).to.equal(0);
      });

      it('should set default settings locale, if not set', async () => {
        settingsService.get.resolves({ locale: 'some locale' });
        languageCookieService.get.returns();
        languageCookieService.set.returnsArg(0);
        expect(await languageService.get()).to.equal('some locale');
        expect(languageCookieService.get.callCount).to.equal(1);
        expect(settingsService.get.callCount).to.equal(1);
        expect(languageCookieService.set.callCount).to.equal(1);
        expect(languageCookieService.set.args[0]).to.deep.equal(['some locale']);
      });

      it('should default to en when no locale setting is set', async () => {
        settingsService.get.resolves({ });
        languageCookieService.get.returns();
        languageCookieService.set.returnsArg(0);
        expect(await languageService.get()).to.equal('en');
        expect(languageCookieService.get.callCount).to.equal(1);
        expect(settingsService.get.callCount).to.equal(1);
        expect(languageCookieService.set.callCount).to.equal(1);
        expect(languageCookieService.set.args[0]).to.deep.equal(['en']);
      });
    });

    describe('useDevanagariScript', () => {
      it('should return true for ne', () => {
        languageCookieService.get.returns('ne');

        expect(languageService.useDevanagariScript()).to.equal(true);
        expect(languageCookieService.get.callCount).to.equal(1);
        expect(settingsService.get.callCount).to.equal(0);
        expect(languageCookieService.set.callCount).to.equal(0);
      });

      it('should return false for anything else', () => {
        languageCookieService.get.returns('en');
        expect(languageService.useDevanagariScript()).to.equal(false);
        languageCookieService.get.returns('es');
        expect(languageService.useDevanagariScript()).to.equal(false);
        languageCookieService.get.returns('sw');
        expect(languageService.useDevanagariScript()).to.equal(false);
        languageCookieService.get.returns('how to write exclusion tests????');
        expect(languageService.useDevanagariScript()).to.equal(false);
      });
    });
  });


});
