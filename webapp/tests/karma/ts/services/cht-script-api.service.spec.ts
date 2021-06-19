import sinon from 'sinon';
import { expect } from 'chai';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

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

    await service.init();

    expect(changesService.subscribe.callCount).to.equal(1);
    expect(changesService.subscribe.args[0][0].key).to.equal('cht-script-api-settings-changes');
    expect(changesService.subscribe.args[0][0].filter).to.be.a('function');
    expect(changesService.subscribe.args[0][0].callback).to.be.a('function');
    expect(settingsService.get.callCount).to.equal(1);
  });

  it('should return versioned api', () => {
    const result = service.getApi();

    expect(result).to.have.all.keys([ 'v1' ]);
    expect(result.v1).to.have.all.keys([ 'hasPermissions', 'hasAnyPermission' ]);
    expect(result.v1.hasPermissions).to.be.a('function');
    expect(result.v1.hasAnyPermission).to.be.a('function');
  });

  describe('v1.hasPermissions()', () => {
    it('should return true when user have the permission', fakeAsync(() => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ 'chw_supervisor', 'gateway' ] });
      service.init();
      tick();
      const api = service.getApi();

      const result = api.v1.hasPermissions('can_edit');

      expect(result).to.be.true;
    }));

    it('should return false when user doesnt have the permission', fakeAsync(() => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ 'chw_supervisor', 'gateway' ] });
      service.init();
      tick();
      const api = service.getApi();

      const result = api.v1.hasPermissions('can_create_people');

      expect(result).to.be.false;
    }));

    it('should react to changes and return false when user is undefined or doesnt have roles', fakeAsync(() => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ 'nurse' ] });
      service.init();
      const changesCallback = changesService.subscribe.args[0][0].callback;
      tick();
      const api = service.getApi();

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

    it('should return true when user is admin', fakeAsync(() => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: [ 'nurse' ]
        }
      });
      sessionService.userCtx.returns({ roles: [ '_admin' ] });
      service.init();
      tick();
      const api = service.getApi();

      const result = api.v1.hasPermissions('can_create_people');

      expect(result).to.be.true;
    }));

    it('should return false when settings doesnt have roles assigned for the permission', fakeAsync(() => {
      settingsService.get.resolves({
        permissions: {
          can_edit: [ 'chw_supervisor' ],
          can_configure: null
        }
      });
      sessionService.userCtx.returns({ roles: [ 'chw_supervisor' ] });
      service.init();
      tick();
      const api = service.getApi();

      const result = api.v1.hasPermissions('can_configure');

      expect(result).to.be.false;
    }));
  });
});
