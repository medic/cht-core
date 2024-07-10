import sinon from 'sinon';
import { expect } from 'chai';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import { HttpClient } from '@angular/common/http';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { SettingsService } from '@mm-services/settings.service';
import { ChangesService } from '@mm-services/changes.service';
import { SessionService } from '@mm-services/session.service';
import { DbService } from '@mm-services/db.service';

describe('CHTScriptApiService service', () => {
  let service: CHTDatasourceService;
  let sessionService;
  let settingsService;
  let changesService;
  let dbService;
  let http;

  beforeEach(() => {
    sessionService = { userCtx: sinon.stub(), isOnlineOnly: sinon.stub() };
    settingsService = { get: sinon.stub() };
    changesService = { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) };
    dbService = { get: sinon.stub().resolves({}) };
    http = { get: sinon.stub().returns(of([])) };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: SettingsService, useValue: settingsService },
        { provide: ChangesService, useValue: changesService },
        { provide: DbService, useValue: dbService },
        { provide: HttpClient, useValue: http },
      ]
    });

    service = TestBed.inject(CHTDatasourceService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('init', () => {

    it('should initialise service for offline user', async () => {
      settingsService.get.resolves();
      const userCtx = { hello: 'world' };
      sessionService.userCtx.returns(userCtx);
      sessionService.isOnlineOnly.returns(false);

      await service.isInitialized();

      expect(changesService.subscribe.callCount).to.equal(1);
      expect(changesService.subscribe.args[0][0].key).to.equal('cht-script-api-settings-changes');
      expect(changesService.subscribe.args[0][0].filter).to.be.a('function');
      expect(changesService.subscribe.args[0][0].callback).to.be.a('function');
      expect(settingsService.get.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      expect(dbService.get.calledOnceWithExactly()).to.be.true;
    });

    it('should initialise service for online user', async () => {
      settingsService.get.resolves();
      const userCtx = { hello: 'world' };
      sessionService.userCtx.returns(userCtx);
      sessionService.isOnlineOnly.returns(true);

      await service.isInitialized();

      expect(changesService.subscribe.callCount).to.equal(1);
      expect(changesService.subscribe.args[0][0].key).to.equal('cht-script-api-settings-changes');
      expect(changesService.subscribe.args[0][0].filter).to.be.a('function');
      expect(changesService.subscribe.args[0][0].callback).to.be.a('function');
      expect(settingsService.get.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
      expect(dbService.get.notCalled).to.be.true;
    });

    it('should return versioned api', async () => {
      settingsService.get.resolves();
      await service.isInitialized();

      const result = await service.get();

      expect(result).to.contain.keys([ 'v1' ]);
      expect(result.v1).to.contain.keys([ 'hasPermissions', 'hasAnyPermission', 'getExtensionLib', 'person' ]);
      expect(result.v1.hasPermissions).to.be.a('function');
      expect(result.v1.hasAnyPermission).to.be.a('function');
      expect(result.v1.getExtensionLib).to.be.a('function');
      expect(result.v1.person).to.be.a('object');
    });

    it('should initialize extension libs', async () => {
      settingsService.get.resolves();
      http.get.onCall(0).returns(of([ 'bar.js', 'foo.js' ]));
      http.get.onCall(1).returns(of('module.exports = (a) => a + a'));
      http.get.onCall(2).returns(of('module.exports = function() { return "foo"; }'));
      await service.isInitialized();

      expect(http.get.callCount).to.equal(3);
      expect(http.get.args[0][0]).to.equal('/extension-libs');
      expect(http.get.args[1][0]).to.equal('/extension-libs/bar.js');
      expect(http.get.args[2][0]).to.equal('/extension-libs/foo.js');

      const result = await service.get();

      const foo = result.v1.getExtensionLib('foo.js');
      expect(foo).to.be.a('function');
      expect(foo()).to.equal('foo');

      const bar = result.v1.getExtensionLib('bar.js');
      expect(bar).to.be.a('function');
      expect(bar('hi')).to.equal('hihi');

      const baz = result.v1.getExtensionLib('baz.js');
      expect(baz).to.be.undefined;
    });

  });

  describe('bind()', () => {
    [true, false].forEach((isOnlineOnly) => {
      it(`binds to a data context when isOnlineOnly is ${isOnlineOnly}`, async () => {
        const settings = { hello: 'settings' } as const;
        settingsService.get.resolves(settings);
        const userCtx = { hello: 'world' };
        sessionService.userCtx.returns(userCtx);
        sessionService.isOnlineOnly.returns(isOnlineOnly);
        const expectedDb = { hello: 'medic' };
        dbService.get.resolves(expectedDb);
        const innerFn = sinon.stub();
        const outerFn = sinon
          .stub()
          .returns(innerFn);

        const result = await service.bind(outerFn);

        expect(outerFn.calledOnce).to.be.true;
        const [dataContext, ...other] = outerFn.args[0];
        expect(other).to.be.empty;
        expect(dataContext.bind).to.be.a('function');
        expect(result).to.equal(innerFn);
        expect(innerFn.notCalled).to.be.true;
        expect(changesService.subscribe.calledOnce).to.be.true;
        expect(changesService.subscribe.args[0][0].key).to.equal('cht-script-api-settings-changes');
        expect(changesService.subscribe.args[0][0].filter).to.be.a('function');
        expect(changesService.subscribe.args[0][0].callback).to.be.a('function');
        expect(sessionService.userCtx.calledOnceWithExactly()).to.be.true;
        expect(settingsService.get.calledOnceWithExactly()).to.be.true;
        expect(http.get.calledOnceWithExactly('/extension-libs', { responseType: 'json' })).to.be.true;
        expect(sessionService.isOnlineOnly.calledOnceWithExactly(userCtx)).to.be.true;
        expect(dbService.get.callCount).to.equal(isOnlineOnly ? 0 : 1);
      });
    });
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
      const api = await service.get();

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
      const api = await service.get();

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
      const api = await service.get();

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
      const api = await service.get();

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
      const api = await service.get();

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
      const api = await service.get();

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
      const api = await service.get();

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
      const api = await service.get();

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
      const api = await service.get();

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
      const api = await service.get();

      const result = api.v1.hasAnyPermission([[ 'can_configure', 'can_create_people' ], [ 'can_backup_facilities' ] ]);

      expect(result).to.be.false;
    });
  });

});
