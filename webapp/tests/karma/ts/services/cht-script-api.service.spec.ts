import sinon from 'sinon';
import { expect } from 'chai';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { CHTScriptApiService } from '@mm-services/cht-script-api.service';
import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';

describe('CHTScriptApiService service', () => {
  let service: CHTScriptApiService;
  let sessionService;
  let settingsService;
  let changesService;

  beforeEach(() => {
    sessionService = { userCtx: sinon.stub() };
    settingsService = { get: sinon.stub() };
    changesService = { subscribe: sinon.stub() };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: SettingsService, useValue: settingsService },
        { provide: ChangesService, useValue: changesService}
      ]
    });

    service = TestBed.inject(CHTScriptApiService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should initialise service', async () => {
    settingsService.get.resolves();
    sessionService.userCtx.returns();

    await service.isInitialized();

    expect(changesService.subscribe.callCount).to.equal(1);
    expect(changesService.subscribe.args[0][0].key).to.equal('cht-script-api-settings-changes');
    expect(changesService.subscribe.args[0][0].filter).to.be.a('function');
    expect(changesService.subscribe.args[0][0].callback).to.be.a('function');
    expect(settingsService.get.callCount).to.equal(1);
  });

  it('should return versioned api', async () => {
    settingsService.get.resolves();
    await service.isInitialized();
    const result = await service.getApi();

    expect(result).to.have.all.keys([ 'v1' ]);
    expect(result.v1).to.have.all.keys([ 'hasPermissions', 'hasAnyPermission' ]);
    expect(result.v1.hasPermissions).to.be.a('function');
    expect(result.v1.hasAnyPermission).to.be.a('function');
  });

  describe('v1.hasPermissions()', () => {
    it('should return true when user has the permission', async () => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ 'chw_supervisor', 'gateway' ] });
      await service.isInitialized();
      const api = await service.getApi();

      const result = api.v1.hasPermissions('can_edit');

      expect(result).to.be.true;
    });

    it('should return false when user doesnt have the permission', async () => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ 'chw_supervisor', 'gateway' ] });
      await service.isInitialized();
      const api = await service.getApi();

      const result = api.v1.hasPermissions('can_create_people');

      expect(result).to.be.false;
    });

    it('should react to settings changes', fakeAsync(async () => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ 'nurse' ] });
      await service.isInitialized();
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const api = await service.getApi();

      const permissionNotFound = api.v1.hasPermissions('can_create_people');

      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ],
          can_create_people: [ 'chw_supervisor', 'nurse' ]
        }
      });
      sinon.resetHistory();
      changesCallback();
      tick();

      const permissionFound = api.v1.hasPermissions('can_create_people');

      expect(permissionNotFound).to.be.false;
      expect(permissionFound).to.be.true;
      expect(sessionService.userCtx.callCount).to.equal(0);
      expect(settingsService.get.callCount).to.equal(1);
    }));

    it('should return true when user is admin', async () => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ '_admin' ] });
      await service.isInitialized();
      const api = await service.getApi();

      const result = api.v1.hasPermissions('can_create_people');

      expect(result).to.be.true;
    });

    it('should return false when settings doesnt have roles assigned for the permission', async () => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: null
        }
      });
      sessionService.userCtx.returns({ roles: [ 'chw_supervisor' ] });
      await service.isInitialized();
      const api = await service.getApi();

      const result = api.v1.hasPermissions('can_configure');

      expect(result).to.be.false;
    });
  });

  describe('v1.hasAnyPermission()', () => {
    it('should return true when user has the any of the permissions', async () => {
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: [ 'national_admin', 'district_admin' ],
          can_export_messages: [ 'national_admin', 'district_admin', 'analytics' ],
          can_add_people: [ 'national_admin', 'district_admin' ],
          can_add_places: [ 'national_admin', 'district_admin' ],
          can_roll_over: [ 'national_admin', 'district_admin' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ 'district_admin' ] });
      await service.isInitialized();
      const api = await service.getApi();

      const result = api.v1.hasAnyPermission([
        [ 'can_backup_facilities' ],
        [ 'can_export_messages', 'can_roll_over' ],
        [ 'can_add_people', 'can_add_places' ],
      ]);

      expect(result).to.be.true;
    });

    it('should return false when user doesnt have the permission', async () => {
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: [ 'national_admin' ],
          can_backup_people: [ 'national_admin' ],
        }
      });
      sessionService.userCtx.returns({ roles: [ 'district_admin' ] });
      await service.isInitialized();
      const api = await service.getApi();

      const result = api.v1.hasAnyPermission([
        [ 'can_backup_facilities', 'can_backup_people' ],
        [ 'can_export_messages', 'can_roll_over' ],
        [ 'can_add_people', 'can_add_places' ]
      ]);

      expect(result).to.be.false;
    });

    it('should react to settings changes', fakeAsync(async () => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor', 'nurse' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ 'nurse' ] });
      await service.isInitialized();
      const changesCallback = changesService.subscribe.args[0][0].callback;
      const api = await service.getApi();

      const permissionNotFound = api.v1.hasAnyPermission([[ 'can_create_people' ], [ '!can_edit' ]]);

      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ],
          can_create_people: [ 'chw_supervisor', 'nurse' ]
        }
      });
      sinon.resetHistory();
      changesCallback();
      tick();

      const permissionFound = api.v1.hasAnyPermission([[ 'can_create_people' ], [ '!can_edit' ]]);

      expect(permissionNotFound).to.be.false;
      expect(permissionFound).to.be.true;
      expect(sessionService.userCtx.callCount).to.equal(0);
      expect(settingsService.get.callCount).to.equal(1);
    }));

    it('should return true when user is admin', async () => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ '_admin' ] });
      await service.isInitialized();
      const api = await service.getApi();

      const result = api.v1.hasAnyPermission([[ 'can_create_people' ], [ 'can_edit', 'can_configure' ]]);

      expect(result).to.be.true;
    });

    it('should return false when settings doesnt have roles assigned for the permission', async () => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: null,
          can_create_people: null,
          can_backup_facilities: null
        }
      });
      sessionService.userCtx.returns({ roles: [ 'chw_supervisor' ] });
      await service.isInitialized();
      const api = await service.getApi();

      const result = api.v1.hasAnyPermission([[ 'can_configure', 'can_create_people' ], [ 'can_backup_facilities' ] ]);

      expect(result).to.be.false;
    });
  });
});
