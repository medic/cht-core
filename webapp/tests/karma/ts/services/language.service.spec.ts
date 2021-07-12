import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SettingsService } from '@mm-services/settings.service';
import { CookieService } from 'ngx-cookie-service';
import { LanguageService } from '@mm-services/language.service';

describe('Language service', () => {
  let service:LanguageService;
  let Settings;
  let cookieGet;
  let cookieSet;

  beforeEach(() => {
    Settings = sinon.stub();
    cookieGet = sinon.stub();
    cookieSet = sinon.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: SettingsService, useValue: { get: Settings } },
        { provide: CookieService, useValue: { get: cookieGet, set: cookieSet } },
      ]
    });
    service = TestBed.inject(LanguageService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('uses the language configured in settings', () => {
    cookieGet.returns(null);
    Settings.resolves({ locale: 'yiddish' });
    return service.get().then((actual) => {
      expect(actual).to.equal('yiddish');
      expect(Settings.callCount).to.equal(1);
      expect(cookieGet.callCount).to.equal(1);
      expect(cookieGet.args[0][0]).to.equal('locale');
      expect(cookieSet.callCount).to.equal(1);
      expect(cookieSet.args[0]).to.deep.equal(['locale', 'yiddish', 365, '/']);
    });
  });

  it('defaults', () => {
    cookieGet.returns(null);
    Settings.resolves({ });
    return service.get().then((actual) => {
      expect(actual).to.equal('en');
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
      expect(Settings.callCount).to.equal(0);
      expect(cookieGet.callCount).to.equal(1);
      expect(cookieSet.callCount).to.equal(0);
      expect(actual).to.equal('ca');
    });
  });

});
