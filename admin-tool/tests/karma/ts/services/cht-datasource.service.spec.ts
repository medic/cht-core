import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { of } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { CHTDatasourceService } from '@admin-tool-services/cht-datasource.service';
import { SessionService } from '@admin-tool-services/session.service';

describe('CHTDatasourceService', () => {
  let service: CHTDatasourceService;
  let sessionService;
  let http;

  beforeEach(() => {
    sessionService = { userCtx: sinon.stub() };
    http = { get: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: HttpClient, useValue: http },
      ]
    });

    service = TestBed.inject(CHTDatasourceService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('isInitialized', () => {
    it('should initialize and fetch settings', async () => {
      const settings = { permissions: { can_configure: ['admin'] } };
      sessionService.userCtx.returns({ name: 'admin', roles: ['_admin'] });
      http.get.withArgs('/api/v1/settings').returns(of(settings));

      await service.isInitialized();

      expect(http.get.calledWith('/api/v1/settings')).to.be.true;
      expect(sessionService.userCtx.callCount).to.equal(1);
    });

    it('should only initialize once', async () => {
      sessionService.userCtx.returns({ name: 'admin', roles: ['_admin'] });
      http.get.returns(of({}));

      await service.isInitialized();
      await service.isInitialized();

      expect(http.get.callCount).to.equal(1);
    });
  });

  describe('get', () => {
    it('should return datasource with wrapped permission methods', async () => {
      const settings = { permissions: { can_configure: ['national_admin'] } };
      const userCtx = { name: 'admin', roles: ['national_admin'] };
      sessionService.userCtx.returns(userCtx);
      http.get.withArgs('/api/v1/settings').returns(of(settings));

      const datasource = await service.get();

      expect(datasource).to.have.property('v1');
      expect(datasource.v1).to.have.property('hasPermissions');
      expect(datasource.v1).to.have.property('hasAnyPermission');
    });

    it('hasPermissions should delegate to datasource with service userCtx roles', async () => {
      const settings = { permissions: { can_configure: ['national_admin'] } };
      const userCtx = { name: 'admin', roles: ['national_admin'] };
      sessionService.userCtx.returns(userCtx);
      http.get.withArgs('/api/v1/settings').returns(of(settings));

      const datasource = await service.get();
      const result = datasource.v1.hasPermissions('can_configure');

      expect(result).to.be.true;
    });

    it('hasPermissions should use provided user roles over service userCtx', async () => {
      const settings = { permissions: { can_configure: ['national_admin'] } };
      sessionService.userCtx.returns({ roles: ['chw'] });
      http.get.withArgs('/api/v1/settings').returns(of(settings));

      const datasource = await service.get();
      const result = datasource.v1.hasPermissions('can_configure', { roles: ['national_admin'] });

      expect(result).to.be.true;
    });

    it('hasPermissions should return false when user lacks permission', async () => {
      const settings = { permissions: { can_configure: ['national_admin'] } };
      const userCtx = { name: 'chw', roles: ['chw'] };
      sessionService.userCtx.returns(userCtx);
      http.get.withArgs('/api/v1/settings').returns(of(settings));

      const datasource = await service.get();
      const result = datasource.v1.hasPermissions('can_configure');

      expect(result).to.be.false;
    });

    it('hasAnyPermission should return true when user has at least one group of permissions', async () => {
      const settings = { permissions: { can_configure: ['national_admin'], can_view: ['chw'] } };
      sessionService.userCtx.returns({ roles: ['chw'] });
      http.get.withArgs('/api/v1/settings').returns(of(settings));

      const datasource = await service.get();
      const result = datasource.v1.hasAnyPermission([['can_configure'], ['can_view']]);

      expect(result).to.be.true;
    });

    it('hasAnyPermission should use provided settings over service settings', async () => {
      const serviceSettings = { permissions: { can_configure: ['national_admin'] } };
      const customSettings = { permissions: { can_configure: ['chw'] } };
      sessionService.userCtx.returns({ roles: ['chw'] });
      http.get.withArgs('/api/v1/settings').returns(of(serviceSettings));

      const datasource = await service.get();
      const result = datasource.v1.hasAnyPermission([['can_configure']], undefined, customSettings);

      expect(result).to.be.true;
    });
  });
});
