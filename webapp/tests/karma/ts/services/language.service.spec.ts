import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { SettingsService } from '@mm-services/settings.service';
import { CookieService } from 'ngx-cookie-service';
import { LanguageService } from '@mm-services/language.service';

describe('Language service', () => {
  let service:LanguageService;
  let UserSettings;
  let Settings;
  let cookieGet;
  let cookieSet;

  beforeEach(() => {
    UserSettings = sinon.stub();
    Settings = sinon.stub();
    cookieGet = sinon.stub();
    cookieSet = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: UserSettingsService, useValue: { get: UserSettings } },
        { provide: SettingsService, useValue: { get: Settings } },
        { provide: CookieService, useValue: { get: cookieGet, set: cookieSet } },
      ]
    });
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    sinon.restore();
  });


  it('uses the language configured in user', () => {
    cookieGet.returns(null);
    UserSettings.resolves({ language: 'latin' });
    return service.get().then((actual) => {
      expect(actual).to.equal('latin');
      expect(UserSettings.callCount).to.equal(1);
      expect(Settings.callCount).to.equal(0);
      expect(cookieGet.callCount).to.equal(1);
      expect(cookieGet.args[0][0]).to.equal('locale');
      expect(cookieSet.callCount).to.equal(1);
      expect(cookieSet.args[0]).to.deep.equal(['locale', 'latin', 365, '/']);
    });
  });

  it('uses the language configured in settings', () => {
    cookieGet.returns(null);
    UserSettings.resolves({ });
    Settings.resolves({ locale: 'yiddish' });
    return service.get().then((actual) => {
      expect(actual).to.equal('yiddish');
      expect(UserSettings.callCount).to.equal(1);
      expect(Settings.callCount).to.equal(1);
      expect(cookieGet.callCount).to.equal(1);
      expect(cookieGet.args[0][0]).to.equal('locale');
      expect(cookieSet.callCount).to.equal(1);
      expect(cookieSet.args[0]).to.deep.equal(['locale', 'yiddish', 365, '/']);
    });
  });

  it('defaults', () => {
    cookieGet.returns(null);
    UserSettings.resolves({ });
    Settings.resolves({ });
    return service.get().then((actual) => {
      expect(actual).to.equal('en');
      expect(UserSettings.callCount).to.equal(1);
      expect(Settings.callCount).to.equal(1);
      expect(cookieGet.callCount).to.equal(1);
      expect(cookieGet.args[0][0]).to.equal('locale');
      expect(cookieSet.callCount).to.equal(1);
      expect(cookieSet.args[0]).to.deep.equal(['locale', 'en', 365, '/']);
    });
  });

  it('uses cookie if set', () => {
    cookieGet.returns('ca');
    return service.get().then((actual) => {
      expect(UserSettings.callCount).to.equal(0);
      expect(Settings.callCount).to.equal(0);
      expect(cookieGet.callCount).to.equal(1);
      expect(cookieSet.callCount).to.equal(0);
      expect(actual).to.equal('ca');
    });
  });

});
