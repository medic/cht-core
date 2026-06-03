import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DOCUMENT } from '@angular/common';

import { SessionService } from '@admin-tool-services/session.service';
import { LocationService } from '@admin-tool-services/location.service';
import { CookieService } from 'ngx-cookie-service';

describe('SessionService', () => {
  let service: SessionService;
  let cookieSet;
  let cookieGet;
  let cookieCheck;
  let cookieDelete;
  let location;
  let http;
  let Location;

  beforeEach(() => {
    cookieSet = sinon.stub();
    cookieDelete = sinon.stub();
    cookieGet = sinon.stub();
    cookieCheck = sinon.stub();
    Location = { dbName: 'medic' };
    location = { href: '' };
    http = {
      get: sinon.stub(),
      delete: sinon.stub(),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: CookieService,
          useValue: { get: cookieGet, set: cookieSet, delete: cookieDelete, check: cookieCheck },
        },
        { provide: LocationService, useValue: Location },
        { provide: DOCUMENT, useValue: { location } },
        { provide: HttpClient, useValue: http },
      ],
    });
    service = TestBed.inject(SessionService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('userCtx', () => {
    it('should parse user context from cookie', () => {
      const expected = { name: 'admin', roles: ['_admin'] };
      cookieGet.returns(JSON.stringify(expected));
      const actual = service.userCtx();
      expect(actual).to.deep.equal(expected);
      expect(cookieGet.args[0][0]).to.equal('userCtx');
    });

    it('should return null when cookie is invalid JSON', () => {
      cookieGet.returns('not-json');
      const actual = service.userCtx();
      expect(actual).to.be.null;
    });

    it('should cache the parsed cookie value', () => {
      const expected = { name: 'admin' };
      cookieGet.returns(JSON.stringify(expected));
      service.userCtx();
      service.userCtx();
      expect(cookieGet.callCount).to.equal(1);
    });
  });

  describe('navigateToLogin', () => {
    it('should redirect to login with redirect and username params', () => {
      const consoleWarnMock = sinon.stub(console, 'warn');
      cookieGet.returns(JSON.stringify({ name: 'admin' }));
      location.href = 'https://localhost/medic/admin/';
      Location.dbName = 'medic';

      service.navigateToLogin();

      expect(location.href).to.contain('/medic/login?');
      expect(location.href).to.contain('username=admin');
      expect(cookieDelete.calledWith('userCtx', '/')).to.be.true;
      expect(consoleWarnMock.callCount).to.equal(1);
    });

    it('should redirect without username when not logged in', () => {
      sinon.stub(console, 'warn');
      cookieGet.returns(JSON.stringify({}));
      location.href = 'https://localhost/medic/';
      Location.dbName = 'medic';

      service.navigateToLogin();

      expect(location.href).to.contain('/medic/login?');
      expect(location.href).not.to.contain('username');
    });
  });

  describe('logout', () => {
    it('should delete session and navigate to login', async () => {
      sinon.stub(console, 'warn');
      const userCtx = { name: 'admin' };
      cookieGet.returns(JSON.stringify(userCtx));
      location.href = 'CURRENT_URL';
      Location.dbName = 'DB_NAME';
      http.delete.withArgs('/_session').returns(of(null));

      await service.logout();

      expect(location.href).to.contain('/DB_NAME/login');
      expect(cookieDelete.args[0][0]).to.equal('userCtx');
    });

    it('should set force login cookie if delete fails', async () => {
      sinon.stub(console, 'warn');
      cookieGet.returns(JSON.stringify({ name: 'admin' }));
      location.href = 'URL';
      Location.dbName = 'medic';
      http.delete.returns(throwError(new Error('network error')));

      await service.logout();

      expect(cookieSet.calledWith('login', 'force', undefined, '/')).to.be.true;
    });
  });

  describe('init', () => {
    it('should logout when no userCtx', async () => {
      sinon.stub(console, 'warn');
      cookieGet.returns(JSON.stringify({}));
      location.href = 'URL';
      Location.dbName = 'medic';
      http.delete.returns(of(null));

      await service.init();

      expect(cookieDelete.args[0][0]).to.equal('userCtx');
    });

    it('should navigate to login on 401 response', async () => {
      sinon.stub(console, 'warn');
      cookieGet.returns(JSON.stringify({ name: 'admin' }));
      Location.dbName = 'medic';
      http.get.withArgs('/_session').returns(throwError({ status: 401 }));

      await service.init();

      expect(cookieDelete.args[0][0]).to.equal('userCtx');
    });

    it('should not logout when server not found (status 0)', async () => {
      cookieGet.returns(JSON.stringify({ name: 'admin' }));
      http.get.withArgs('/_session').returns(throwError({ status: 0 }));

      await service.init();

      expect(cookieDelete.callCount).to.equal(0);
    });

    it('should logout when remote name does not match cookie', async () => {
      sinon.stub(console, 'warn');
      cookieGet.returns(JSON.stringify({ name: 'admin' }));
      location.href = 'URL';
      Location.dbName = 'medic';
      http.get.withArgs('/_session').returns(of({ userCtx: { name: 'other', roles: [] } }));
      http.delete.returns(of(null));

      await service.init();

      expect(location.href).to.contain('/medic/login');
    });

    it('should not logout when remote session is consistent', async () => {
      cookieGet.returns(JSON.stringify({ name: 'admin', roles: ['_admin'] }));
      http.get.withArgs('/_session').returns(of({ userCtx: { name: 'admin', roles: ['_admin'] } }));

      await service.init();

      expect(cookieDelete.callCount).to.equal(0);
    });

    it('should refresh userCtx when server has extra roles compared to cookie', async () => {
      cookieGet.returns(JSON.stringify({ name: 'admin', roles: ['_admin'] }));
      Location.dbName = 'medic';
      // Server has extra role
      http.get.withArgs('/_session').returns(of({ userCtx: { name: 'admin', roles: ['_admin', 'new_role'] } }));
      http.get.withArgs('/medic/login/identity').returns(of({}));

      await service.init();

      expect(http.get.calledWith('/medic/login/identity')).to.be.true;
    });
  });

  describe('check', () => {
    it('should navigate to login when cookie is missing', () => {
      sinon.stub(console, 'warn');
      cookieCheck.returns(false);
      cookieGet.returns('{}');
      location.href = 'URL';
      Location.dbName = 'medic';

      service.check();

      expect(location.href).to.contain('/medic/login');
    });

    it('should not navigate when cookie is present', () => {
      cookieCheck.returns(true);
      location.href = 'URL';

      service.check();

      expect(location.href).to.equal('URL');
    });
  });

  describe('hasRole', () => {
    it('should return false if user has no roles', () => {
      cookieGet.returns(JSON.stringify({}));
      expect(service.hasRole('chw')).to.be.false;
    });

    it('should return false if user does not have the role', () => {
      cookieGet.returns(JSON.stringify({ roles: ['nurse'] }));
      expect(service.hasRole('chw')).to.be.false;
    });

    it('should return true if user has the role', () => {
      cookieGet.returns(JSON.stringify({ roles: ['nurse', 'chw'] }));
      expect(service.hasRole('chw')).to.be.true;
    });

    it('should use provided userCtx instead of cookie', () => {
      expect(service.hasRole('_admin', { roles: ['_admin'] })).to.be.true;
      expect(cookieGet.callCount).to.equal(0);
    });
  });

  describe('isAdmin', () => {
    it('should return false when not logged in', () => {
      cookieGet.returns(JSON.stringify({}));
      expect(service.isAdmin()).to.equal(false);
    });

    it('should return true for _admin role', () => {
      cookieGet.returns(JSON.stringify({ roles: ['_admin'] }));
      expect(service.isAdmin()).to.equal(true);
    });

    it('should return false for national_admin', () => {
      cookieGet.returns(JSON.stringify({ roles: ['national_admin'] }));
      expect(service.isAdmin()).to.equal(false);
    });
  });

  describe('isOnlineOnly', () => {
    it('should return true for _admin', () => {
      cookieGet.returns(JSON.stringify({ roles: ['_admin'] }));
      expect(service.isOnlineOnly()).to.be.true;
    });

    it('should return true for mm-online role', () => {
      cookieGet.returns(JSON.stringify({ roles: ['mm-online'] }));
      expect(service.isOnlineOnly()).to.be.true;
    });

    it('should return false for regular user', () => {
      cookieGet.returns(JSON.stringify({ roles: ['chw'] }));
      expect(service.isOnlineOnly()).to.be.false;
    });
  });
});
