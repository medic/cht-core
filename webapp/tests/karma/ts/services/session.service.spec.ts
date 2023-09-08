import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DOCUMENT } from '@angular/common';

import { SessionService } from '@mm-services/session.service';
import { LocationService } from '@mm-services/location.service';
import { CookieService } from 'ngx-cookie-service';

describe('Session service', () => {
  let service:SessionService;
  let cookieSet;
  let cookieGet;
  let cookieDelete;
  let location;
  let $httpBackend;
  let Location;

  beforeEach(() => {
    cookieSet = sinon.stub();
    cookieDelete = sinon.stub();
    cookieGet = sinon.stub();
    Location = {};
    location = { href: '' };
    $httpBackend = {
      get: sinon.stub(),
      delete: sinon.stub(),
    };
    const documentMock = {
      location: location,
      querySelectorAll: sinon.stub().returns([]),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CookieService, useValue: { get: cookieGet, set: cookieSet, delete: cookieDelete } },
        { provide: LocationService, useValue: Location },
        { provide: DOCUMENT, useValue: documentMock },
        { provide: HttpClient, useValue: $httpBackend },
      ],
    });
    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('gets the user context', () => {
    const expected = { name: 'bryan' };
    cookieGet.returns(JSON.stringify(expected));
    const actual = service.userCtx();
    expect(actual).to.deep.equal(expected);
    expect(cookieGet.args[0][0]).to.equal('userCtx');
  });

  it('logs out', async () => {
    const consoleWarnMock = sinon.stub(console, 'warn');
    const userCtxExpected = { name: 'bryan' };
    cookieGet.returns(JSON.stringify(userCtxExpected));
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    $httpBackend.delete.withArgs('/_session').returns(of());
    await service.logout();
    expect(location.href).to.equal(`/DB_NAME/login?redirect=CURRENT_URL&username=${userCtxExpected.name}`);
    expect(cookieDelete.args[0][0]).to.equal('userCtx');
    expect(consoleWarnMock.callCount).to.equal(1);
    expect(consoleWarnMock.args[0][0]).to.equal('User must reauthenticate');
  });

  it('logs out if no user context', async () => {
    const consoleWarnMock = sinon.stub(console, 'warn');
    cookieGet.returns(JSON.stringify({}));
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    $httpBackend.delete.withArgs('/_session').returns(of());
    await service.init();
    expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    expect(cookieDelete.args[0][0]).to.equal('userCtx');
    expect(consoleWarnMock.callCount).to.equal(1);
    expect(consoleWarnMock.args[0][0]).to.equal('User must reauthenticate');
  });

  it('cookie gets deleted when session expires', async () => {
    const consoleWarnMock = sinon.stub(console, 'warn');
    cookieGet.returns(JSON.stringify({ name: 'bryan' }));
    Location.dbName = 'DB_NAME';
    $httpBackend.get.withArgs('/_session').returns(throwError({ status: 401 }));
    await service.init();
    expect(cookieDelete.args[0][0]).to.equal('userCtx');
    expect(consoleWarnMock.callCount).to.equal(1);
    expect(consoleWarnMock.args[0][0]).to.equal('User must reauthenticate');
  });

  it('does not log out if server not found', async () => {
    cookieGet.returns(JSON.stringify({ name: 'bryan' }));
    $httpBackend.get.withArgs('/_session').returns(throwError({ status: 0 }));
    await service.init();
    expect(cookieDelete.callCount).to.equal(0);
    const headers = $httpBackend.get.args[0][1].headers;
    expect(headers.get('Accept')).to.equal('application/json');
  });

  it('logs out if remote userCtx inconsistent', async () => {
    const consoleWarnMock = sinon.stub(console, 'warn');
    const userCtxExpected = { name: 'bryan' };
    cookieGet.returns(JSON.stringify(userCtxExpected));
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    $httpBackend.get.withArgs('/_session').returns(of([{ data: { userCtx: { name: 'jimmy' } } }]));
    $httpBackend.delete.withArgs('/_session').returns(of());
    await service.init();
    expect(location.href).to.equal(`/DB_NAME/login?redirect=CURRENT_URL&username=${userCtxExpected.name}`);
    expect(cookieDelete.args[0][0]).to.equal('userCtx');
    expect(consoleWarnMock.callCount).to.equal(1);
    expect(consoleWarnMock.args[0][0]).to.equal('User must reauthenticate');
  });

  it('does not log out if remote userCtx consistent', async () => {
    cookieGet.returns(JSON.stringify({ name: 'bryan' }));
    $httpBackend.get.withArgs('/_session').returns(of([{ data: { userCtx: { name: 'bryan' } } }]));
    await service.init();
    expect(cookieDelete.callCount).to.equal(0);
  });

  describe('hasRole', () => {
    it('should return false if user is not logged in', () => {
      cookieGet.returns(JSON.stringify({}));
      expect(service.hasRole('chw')).to.be.false;
    });

    it('should return false if user does not have the role', () => {
      cookieGet.returns(JSON.stringify({ roles: [ 'nurse', 'chw-supervisor' ] }));
      expect(service.hasRole('chw')).to.be.false;
    });

    it('should return false if user does not have any role', () => {
      cookieGet.returns(JSON.stringify({ roles: [] }));
      expect(service.hasRole('chw')).to.be.false;
    });

    it('should return true if user has the role', () => {
      cookieGet.returns(JSON.stringify({ roles: [ 'nurse', 'chw-supervisor', 'chw' ] }));
      expect(service.hasRole('chw')).to.be.true;
    });
  });

  describe('isAdmin function', () => {

    it('returns false if not logged in', () => {
      cookieGet.returns(JSON.stringify({}));
      const actual = service.isAdmin();
      expect(actual).to.equal(false);
    });

    it('returns true for _admin', () => {
      cookieGet.returns(JSON.stringify({ roles: [ '_admin' ] }));
      const actual = service.isAdmin();
      expect(actual).to.equal(true);
    });

    it('returns false for national_admin', () => {
      cookieGet.returns(JSON.stringify({ roles: [ 'national_admin', 'some_other_role' ] }));
      const actual = service.isAdmin();
      expect(actual).to.equal(false);
    });

    it('returns false for everyone else', () => {
      cookieGet.returns(JSON.stringify({ roles: [ 'district_admin', 'some_other_role' ] }));
      const actual = service.isAdmin();
      expect(actual).to.equal(false);
    });

  });

  describe('isDbAdmin', () => {
    it('should return false if not logged in', () => {
      cookieGet.returns(JSON.stringify({}));
      expect(service.isDbAdmin()).to.equal(false);
    });

    it('returns true for _admin', () => {
      cookieGet.returns(JSON.stringify({ roles: [ '_admin' ] }));
      expect(service.isDbAdmin()).to.equal(true);
      expect(service.isDbAdmin({ roles: ['_admin', 'aaaa'] })).to.equal(true);
    });

    it('returns false for everyone else', () => {
      cookieGet.returns(JSON.stringify({ roles: [ 'district_admin', 'some_other_role' ] }));
      expect(service.isDbAdmin()).to.equal(false);
      cookieGet.returns(JSON.stringify({ roles: [ 'national_admin', 'some_other_role' ] }));
      expect(service.isDbAdmin()).to.equal(false);
      expect(service.isDbAdmin({ roles: ['role1', 'national_admin'] })).to.equal(false);
    });
  });
});
