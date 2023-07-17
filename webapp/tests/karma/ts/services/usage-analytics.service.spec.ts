import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import sinon from 'sinon';
import { expect } from 'chai';

import { CAN_TRACK_USAGE_ANALYTICS, MatomoConfig, UsageAnalyticsService } from '@mm-services/usage-analytics.service';
import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';

describe('Usage Analytics service', () => {
  let service: UsageAnalyticsService;
  let router;
  let authService;
  let sessionService;
  let settingsService;
  let documentMock;
  let scriptElement;
  let headElement;
  let consoleWarnStub;

  beforeEach(() => {
    consoleWarnStub = sinon.stub(console, 'warn');
    router = { events: new Subject() };
    authService = { has: sinon.stub() };
    sessionService = { isDbAdmin: sinon.stub() };
    settingsService = { get: sinon.stub() };
    scriptElement = {};
    headElement = { appendChild: sinon.stub() };
    documentMock = {
      querySelectorAll: sinon.stub().returns([]),
      createElement: sinon.stub().returns(scriptElement),
      getElementsByTagName: sinon.stub().returns([ headElement ]),
      defaultView: { _paq: [], location: { href: '' } }
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: SessionService, useValue: sessionService },
        { provide: SettingsService, useValue: settingsService },
        { provide: DOCUMENT, useValue: documentMock},
      ],
    });
    router = TestBed.inject(Router);
    service = TestBed.inject(UsageAnalyticsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('init()', () => {
    it('should init usage analytics tracker', async () => {
      authService.has.resolves(true);
      sessionService.isDbAdmin.returns(false);
      settingsService.get.resolves({
        usage_analytics: {
          server_url: 'https://usage-analytics.medic.org',
          site_id: 1,
          site_sha: 'some-sha',
        },
      });

      await service.init();

      expect(sessionService.isDbAdmin.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0][0]).to.equal(CAN_TRACK_USAGE_ANALYTICS);
      expect(documentMock.defaultView._paq).to.have.deep.members([
        [ MatomoConfig.DISABLE_CAPTURE_KEYSTROKES ],
        [ MatomoConfig.MATCH_TRACKER_URL ],
        [ MatomoConfig.TRACK_PAGE_VIEW ],
        [ MatomoConfig.ENABLE_LINK_TRACKING ],
        [ MatomoConfig.SET_TRACKER_URL, 'https://usage-analytics.medic.org/matomo.php' ],
        [ MatomoConfig.SET_SITE_ID, '1' ]
      ]);
      expect(documentMock.getElementsByTagName.calledOnce).to.be.true;
      expect(documentMock.getElementsByTagName.args[0][0]).to.equal('head');
      expect(documentMock.createElement.calledOnce).to.be.true;
      expect(documentMock.createElement.args[0][0]).to.equal('script');
      expect(scriptElement.type).to.equal('text/javascript');
      expect(scriptElement.async).to.equal(true);
      expect(scriptElement.src).to.equal('https://usage-analytics.medic.org/matomo.js');
      expect(scriptElement.onload).to.not.be.undefined;
      expect(headElement.appendChild.calledOnce).to.be.true;
      expect(headElement.appendChild.args[0][0]).to.deep.equal(scriptElement);
    });

    it('should not init usage analytics tracker when no permissions', async () => {
      authService.has.resolves(false);
      sessionService.isDbAdmin.returns(false);
      settingsService.get.resolves({
        usage_analytics: {
          server_url: 'https://usage-analytics.medic.org',
          site_id: 1,
          site_sha: 'some-sha',
        },
      });

      await service.init();

      expect(sessionService.isDbAdmin.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0][0]).to.equal(CAN_TRACK_USAGE_ANALYTICS);
      expect(documentMock.defaultView._paq).to.have.deep.members([]);
      expect(documentMock.getElementsByTagName.notCalled).to.be.true;
      expect(documentMock.createElement.notCalled).to.be.true;
      expect(headElement.appendChild.notCalled).to.be.true;
    });

    it('should not init usage analytics tracker when user is DB Admin', async () => {
      authService.has.resolves(true);
      sessionService.isDbAdmin.returns(true);
      settingsService.get.resolves({
        usage_analytics: {
          server_url: 'https://usage-analytics.medic.org',
          site_id: 1,
          site_sha: 'some-sha',
        },
      });

      await service.init();

      expect(sessionService.isDbAdmin.calledOnce).to.be.true;
      expect(authService.has.notCalled).to.be.true;
      expect(documentMock.defaultView._paq).to.have.deep.members([]);
      expect(documentMock.getElementsByTagName.notCalled).to.be.true;
      expect(documentMock.createElement.notCalled).to.be.true;
      expect(headElement.appendChild.notCalled).to.be.true;
    });

    it('should warn when setting are not defined', async () => {
      authService.has.resolves(true);
      sessionService.isDbAdmin.returns(false);
      settingsService.get.resolves({
        usage_analytics: {},
      });

      await service.init();

      expect(consoleWarnStub.calledOnce).to.be.true;
      expect(consoleWarnStub.args[0][0]).to.equal(
        'Usage Analytics :: Missing configuration. Server URL: undefined Site ID: undefined'
      );
      expect(sessionService.isDbAdmin.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0][0]).to.equal(CAN_TRACK_USAGE_ANALYTICS);
      expect(documentMock.defaultView._paq).to.have.deep.members([]);
      expect(documentMock.getElementsByTagName.notCalled).to.be.true;
      expect(documentMock.createElement.notCalled).to.be.true;
      expect(headElement.appendChild.notCalled).to.be.true;
    });

    it('should warn when cannot get settings', async () => {
      authService.has.resolves(true);
      sessionService.isDbAdmin.returns(false);
      settingsService.get.rejects('any');

      await service.init();

      expect(consoleWarnStub.calledOnce).to.be.true;
      expect(consoleWarnStub.args[0][0]).to.equal(
        'Usage Analytics :: Missing configuration. Server URL: undefined Site ID: undefined'
      );
      expect(sessionService.isDbAdmin.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0][0]).to.equal(CAN_TRACK_USAGE_ANALYTICS);
      expect(documentMock.defaultView._paq).to.have.deep.members([]);
      expect(documentMock.getElementsByTagName.notCalled).to.be.true;
      expect(documentMock.createElement.notCalled).to.be.true;
      expect(headElement.appendChild.notCalled).to.be.true;
    });
  });

  describe('trackNavigation', () => {
    it('should track when navigation ended', fakeAsync(async () => {
      authService.has.resolves(true);
      sessionService.isDbAdmin.returns(false);
      settingsService.get.resolves({
        usage_analytics: {
          server_url: 'https://usage-analytics.medic.org',
          site_id: 1,
          site_sha: 'some-sha',
        },
      });

      await service.init();
      flush();
      scriptElement.onload();
      flush();
      documentMock.defaultView.location.href = 'http://localhost/toB';
      router.events.next(new NavigationEnd(0, 'http://localhost/fromA', 'http://localhost/toB'));
      flush();

      expect(documentMock.defaultView._paq).to.have.deep.members([
        [ MatomoConfig.DISABLE_CAPTURE_KEYSTROKES ],
        [ MatomoConfig.MATCH_TRACKER_URL ],
        [ MatomoConfig.TRACK_PAGE_VIEW ],
        [ MatomoConfig.ENABLE_LINK_TRACKING ],
        [ MatomoConfig.SET_TRACKER_URL, 'https://usage-analytics.medic.org/matomo.php' ],
        [ MatomoConfig.SET_SITE_ID, '1' ],
        [ MatomoConfig.SET_CUSTOM_URL, 'http://localhost/toB' ],
        [ MatomoConfig.TRACK_PAGE_VIEW ],
        [ MatomoConfig.ENABLE_LINK_TRACKING ],
      ]);

      documentMock.defaultView.location.href = 'http://localhost#/contacts/toC';
      documentMock.defaultView.location.hash = '#/contacts/toC';
      router.events.next(new NavigationEnd(0, 'http://localhost/fromB', 'http://localhost#/contacts/toC'));
      flush();

      expect(documentMock.defaultView._paq).to.have.deep.members([
        [ MatomoConfig.DISABLE_CAPTURE_KEYSTROKES ],
        [ MatomoConfig.MATCH_TRACKER_URL ],
        [ MatomoConfig.TRACK_PAGE_VIEW ],
        [ MatomoConfig.ENABLE_LINK_TRACKING ],
        [ MatomoConfig.SET_TRACKER_URL, 'https://usage-analytics.medic.org/matomo.php' ],
        [ MatomoConfig.SET_SITE_ID, '1' ],
        [ MatomoConfig.SET_CUSTOM_URL, 'http://localhost/toB' ],
        [ MatomoConfig.TRACK_PAGE_VIEW ],
        [ MatomoConfig.ENABLE_LINK_TRACKING ],
        [ MatomoConfig.SET_DOCUMENT_TITLE, 'contacts' ],
        [ MatomoConfig.SET_REFERENCE_URL, 'http://localhost/toB' ],
        [ MatomoConfig.SET_CUSTOM_URL, 'http://localhost#/contacts/toC' ],
        [ MatomoConfig.TRACK_PAGE_VIEW ],
        [ MatomoConfig.ENABLE_LINK_TRACKING ],
      ]);
    }));
  });

  describe('trackEvent()', () => {
    it('should track event', fakeAsync(async () => {
      authService.has.resolves(true);
      sessionService.isDbAdmin.returns(false);
      settingsService.get.resolves({
        usage_analytics: {
          server_url: 'https://usage-analytics.medic.org',
          site_id: 1,
          site_sha: 'some-sha',
        },
      });
      await service.init();
      flush();

      sinon.resetHistory();
      await service.trackEvent('a-category', 'an-action', 'a-name');
      flush();

      expect(sessionService.isDbAdmin.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0][0]).to.equal(CAN_TRACK_USAGE_ANALYTICS);
      expect(documentMock.defaultView._paq).to.have.deep.members([
        [ MatomoConfig.DISABLE_CAPTURE_KEYSTROKES ],
        [ MatomoConfig.MATCH_TRACKER_URL ],
        [ MatomoConfig.TRACK_PAGE_VIEW ],
        [ MatomoConfig.ENABLE_LINK_TRACKING ],
        [ MatomoConfig.SET_TRACKER_URL, 'https://usage-analytics.medic.org/matomo.php' ],
        [ MatomoConfig.SET_SITE_ID, '1' ],
        [ MatomoConfig.TRACK_EVENT, 'a-category', 'an-action', 'a-name' ]
      ]);
    }));

    it('should track event when name not sent', fakeAsync(async () => {
      authService.has.resolves(true);
      sessionService.isDbAdmin.returns(false);
      settingsService.get.resolves({
        usage_analytics: {
          server_url: 'https://usage-analytics.medic.org',
          site_id: 1,
          site_sha: 'some-sha',
        },
      });
      await service.init();
      flush();

      sinon.resetHistory();
      await service.trackEvent('a-category', 'an-action');
      flush();

      expect(sessionService.isDbAdmin.calledOnce).to.be.true;
      expect(authService.has.calledOnce).to.be.true;
      expect(authService.has.args[0][0]).to.equal(CAN_TRACK_USAGE_ANALYTICS);
      expect(documentMock.defaultView._paq).to.have.deep.members([
        [ MatomoConfig.DISABLE_CAPTURE_KEYSTROKES ],
        [ MatomoConfig.MATCH_TRACKER_URL ],
        [ MatomoConfig.TRACK_PAGE_VIEW ],
        [ MatomoConfig.ENABLE_LINK_TRACKING ],
        [ MatomoConfig.SET_TRACKER_URL, 'https://usage-analytics.medic.org/matomo.php' ],
        [ MatomoConfig.SET_SITE_ID, '1' ],
        [ MatomoConfig.TRACK_EVENT, 'a-category', 'an-action' ]
      ]);
    }));
  });
});
