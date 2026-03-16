import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';
import { of } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { SessionService } from '@admin-tool-services/session.service';
import { AuthService } from '@admin-tool-services/auth.service';
import { CHTDatasourceService } from '@admin-tool-services/cht-datasource.service';

describe('AuthService', () => {
  let service: AuthService;
  let sessionService;
  let chtDatasourceService: CHTDatasourceService;
  let http;

  beforeEach(() => {
    sessionService = { userCtx: sinon.stub(), isOnlineOnly: sinon.stub() };
    http = { get: sinon.stub().returns(of({})) };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: HttpClient, useValue: http },
      ]
    });

    service = TestBed.inject(AuthService);
    chtDatasourceService = TestBed.inject(CHTDatasourceService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('has', () => {
    it('should return false when no session', async () => {
      sessionService.userCtx.returns(null);
      http.get.returns(of({ permissions: {} }));
      chtDatasourceService['initialized'] = null;

      const result = await service.has('can_configure');

      expect(result).to.be.false;
    });

    it('should return true when user is db admin', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      http.get.returns(of({ permissions: { can_backup_facilities: ['national_admin'] } }));
      chtDatasourceService['initialized'] = null;

      const result = await service.has(['can_backup_facilities']);

      expect(result).to.be.true;
    });

    it('should return false when user does not have permission', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      http.get.returns(of({ permissions: { can_backup_facilities: ['national_admin'] } }));
      chtDatasourceService['initialized'] = null;

      const result = await service.has('can_backup_facilities');

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions', async () => {
      sessionService.userCtx.returns({ roles: ['national_admin'] });
      http.get.returns(of({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_export_messages: ['national_admin', 'district_admin'],
        }
      }));
      chtDatasourceService['initialized'] = null;

      const result = await service.has(['can_backup_facilities', 'can_export_messages']);

      expect(result).to.be.true;
    });

    it('should return false when admin and !permission', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      http.get.returns(of({ permissions: {} }));
      chtDatasourceService['initialized'] = null;

      const result = await service.has(['!can_backup_facilities']);

      expect(result).to.be.false;
    });

    it('should return true when user has !permission they lack', async () => {
      sessionService.userCtx.returns({ roles: ['analytics'] });
      http.get.returns(of({
        permissions: { can_backup_facilities: ['national_admin'] }
      }));
      chtDatasourceService['initialized'] = null;

      const result = await service.has(['!can_backup_facilities']);

      expect(result).to.be.true;
    });

    it('should throw error when server is offline (503)', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      http.get.returns(of({ permissions: {} }));
      chtDatasourceService['initialized'] = null;
      // Stub get() to reject with 503
      sinon.stub(chtDatasourceService, 'get').rejects({ status: 503 });

      try {
        await service.has(['can_configure']);
        expect.fail('should have thrown');
      } catch (err: any) {
        expect(err).to.deep.equal({ status: 503 });
      }
    });

    it('should return false when settings fetch fails with non-503', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      chtDatasourceService['initialized'] = null;
      sinon.stub(chtDatasourceService, 'get').rejects({ status: 500 });

      const result = await service.has(['can_configure']);

      expect(result).to.be.false;
    });
  });

  describe('any', () => {
    it('should delegate to has() when not an array', async () => {
      sessionService.userCtx.returns({ roles: ['national_admin'] });
      http.get.returns(of({ permissions: { can_configure: ['national_admin'] } }));
      chtDatasourceService['initialized'] = null;

      const result = await service.any('can_configure');

      expect(result).to.be.true;
    });

    it('should return false when no session', async () => {
      sessionService.userCtx.returns(null);
      http.get.returns(of({ permissions: {} }));
      chtDatasourceService['initialized'] = null;

      const result = await service.any([['can_edit'], ['can_configure']]);

      expect(result).to.be.false;
    });

    it('should return true when admin and no disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      http.get.returns(of({ permissions: { can_edit: ['chw'] } }));
      chtDatasourceService['initialized'] = null;

      const result = await service.any([['can_backup_facilities'], ['can_export_messages']]);

      expect(result).to.be.true;
    });

    it('should return true when user has all permissions in one group', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      http.get.returns(of({
        permissions: {
          can_backup_facilities: ['national_admin', 'district_admin'],
          can_export_messages: ['national_admin', 'district_admin'],
        }
      }));
      chtDatasourceService['initialized'] = null;

      const result = await service.any([
        ['can_backup_facilities', 'can_export_messages'],
        ['can_add_people'],
      ]);

      expect(result).to.be.true;
    });

    it('should return false when get() throws in any() path', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      chtDatasourceService['initialized'] = null;
      sinon.stub(chtDatasourceService, 'get').rejects(new Error('network error'));

      const result = await service.any([['can_configure'], ['can_upgrade']]);

      expect(result).to.be.false;
    });

    it('should return false when user has none of the permissions in any group', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      http.get.returns(of({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_backup_people: ['national_admin'],
        }
      }));
      chtDatasourceService['initialized'] = null;

      const result = await service.any([
        ['can_backup_facilities', 'can_backup_people'],
        ['can_export_messages'],
      ]);

      expect(result).to.be.false;
    });
  });

  describe('online', () => {
    it('should return false when no session', () => {
      sessionService.userCtx.returns(null);

      const result = service.online(true);

      expect(result).to.be.false;
      expect(sessionService.isOnlineOnly.callCount).to.equal(0);
    });

    it('should return true when requesting online and user is online', () => {
      sessionService.userCtx.returns({ roles: ['mm-online'] });
      sessionService.isOnlineOnly.returns(true);

      const result = service.online(true);

      expect(result).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
    });

    it('should return true when requesting offline and user is offline', () => {
      sessionService.userCtx.returns({ roles: ['chw'] });
      sessionService.isOnlineOnly.returns(false);

      const result = service.online(false);

      expect(result).to.be.true;
    });

    it('should return false when requesting online and user is offline', () => {
      sessionService.userCtx.returns({ roles: ['chw'] });
      sessionService.isOnlineOnly.returns(false);

      const result = service.online(true);

      expect(result).to.be.false;
    });

    it('should return false when requesting offline and user is online', () => {
      sessionService.userCtx.returns({ roles: ['mm-online'] });
      sessionService.isOnlineOnly.returns(true);

      const result = service.online(false);

      expect(result).to.be.false;
    });

    it('should accept truthy input', () => {
      sessionService.userCtx.returns({ roles: ['mm-online'] });
      sessionService.isOnlineOnly.returns(true);

      expect(service.online('yes')).to.be.true;
      expect(service.online(['something'])).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(2);
    });

    it('should accept falsy input', () => {
      sessionService.userCtx.returns({ roles: ['chw'] });
      sessionService.isOnlineOnly.returns(false);

      expect(service.online()).to.be.true;
      expect(service.online(undefined)).to.be.true;
      expect(service.online(null)).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(3);
    });
  });
});
