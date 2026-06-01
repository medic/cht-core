import { TestBed } from '@angular/core/testing';
import { expect } from 'chai';
import sinon from 'sinon';
import { DOCUMENT } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { Router } from '@angular/router';

import { SessionCacheService } from '@mm-services/session-cache.service';
import { SessionService } from '@mm-services/session.service';
import { LocationService } from '@mm-services/location.service';

describe('SessionCacheService', () => {
  let service: SessionCacheService;
  let cookieService: {
    get: sinon.SinonStub;
    set: sinon.SinonStub;
    delete: sinon.SinonStub;
  };
  let sessionService: {
    userCtx: sinon.SinonStub;
    userCtxCookieValue: unknown;
  };
  let router: {
    navigate: sinon.SinonStub;
  };
  let locationService: {
    dbName: string;
  };
  let documentMock: {
    location: {
      href: string;
      pathname: string;
    };
  };

  beforeEach(() => {
    cookieService = {
      get: sinon.stub(),
      set: sinon.stub(),
      delete: sinon.stub(),
    };
    sessionService = {
      userCtx: sinon.stub(),
      userCtxCookieValue: null,
    };
    router = {
      navigate: sinon.stub().resolves(true),
    };
    locationService = {
      dbName: 'medic',
    };
    documentMock = {
      location: { href: '', pathname: '/medic/' },
    };
    globalThis.localStorage.removeItem('cht-session-cache');

    TestBed.configureTestingModule({
      providers: [
        SessionCacheService,
        { provide: CookieService, useValue: cookieService },
        { provide: SessionService, useValue: sessionService },
        { provide: Router, useValue: router },
        { provide: LocationService, useValue: locationService },
        { provide: DOCUMENT, useValue: documentMock },
      ],
    });

    service = TestBed.inject(SessionCacheService);
  });

  afterEach(() => {
    globalThis.localStorage.removeItem('cht-session-cache');
    sinon.restore();
  });

  it('caches active session for current username', () => {
    sessionService.userCtx.returns({ name: 'user-a' });
    cookieService.get.withArgs('userCtx').returns('session-token-a');

    const cached = service.cacheActiveSession();
    const value = JSON.parse(globalThis.localStorage.getItem('cht-session-cache') || '{}');

    expect(cached).to.be.true;
    expect(value).to.deep.equal({ 'user-a': 'session-token-a' });
  });

  it('lists cached accounts', () => {
    globalThis.localStorage.setItem('cht-session-cache', JSON.stringify({
      'user-b': 'session-b',
      'user-a': 'session-a',
    }));

    const accounts = service.listCachedAccounts();

    expect(accounts).to.deep.equal([
      { username: 'user-a' },
      { username: 'user-b' },
    ]);
  });

  it('restores cached session for selected account', () => {
    globalThis.localStorage.setItem('cht-session-cache', JSON.stringify({
      'user-a': 'session-token-a',
    }));

    const restored = service.restoreSession('user-a');

    expect(restored).to.be.true;
    expect(cookieService.set.calledOnceWith('userCtx', 'session-token-a', undefined, '/')).to.be.true;
    expect(cookieService.delete.calledWith('login', '/')).to.be.true;
    expect(documentMock.location.href).to.equal('/medic/#/home');
  });
});
