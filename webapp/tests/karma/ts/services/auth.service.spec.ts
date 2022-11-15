import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';
import { ChangesService } from '@mm-services/changes.service';
import { CHTScriptApiService } from '@mm-services/cht-script-api.service';

describe('Auth Service', () => {
  let service:AuthService;
  let sessionService;
  let settingsService;
  let chtScriptApiService;
  let changesService;

  beforeEach(() => {
    sessionService = { userCtx: sinon.stub(), isOnlineOnly: sinon.stub() };
    settingsService = { get: sinon.stub() };
    changesService = { subscribe: sinon.stub().resolves() };

    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: sessionService },
        { provide: SettingsService, useValue: settingsService },
        { provide: ChangesService, useValue: changesService }
      ]
    });

    service = TestBed.inject(AuthService);
    chtScriptApiService = TestBed.inject(CHTScriptApiService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('authService.has', () => {
    it('should return false when no settings', async () => {
      sessionService.userCtx.returns({ roles: ['chw'] });
      settingsService.get.resolves(null);
      chtScriptApiService.init();

      const result = await service.has('can_edit');

      expect(result).to.be.false;
    });

    it('should return false when no permissions configured', async () => {
      sessionService.userCtx.returns({ roles: ['chw'] });
      settingsService.get.resolves({});
      chtScriptApiService.init();

      const result = await service.has('can_edit');

      expect(result).to.be.false;
    });

    it('should return false when no session', async () => {
      sessionService.userCtx.returns(null);
      settingsService.get.resolves({ permissions: {} });
      chtScriptApiService.init();

      const result = await service.has();

      expect(result).to.be.false;
    });

    it('should return false when user has no role', async () => {
      sessionService.userCtx.returns({});
      settingsService.get.resolves({ permissions: {} });
      chtScriptApiService.init();

      const result = await service.has();

      expect(result).to.be.false;
    });

    it('should return true when user is db admin', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      settingsService.get.resolves({ permissions: { can_edit: ['chw'] } });
      chtScriptApiService.init();

      const result = await service.has(['can_backup_facilities']);

      expect(result).to.be.true;
    });

    it('should return false when settings errors', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.rejects('boom');
      chtScriptApiService.init();

      const result = await service.has(['can_backup_facilities']);

      expect(result).to.be.false;
    });

    it('should return false when permission parameter is empty string', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_export_messages: [
            'national_admin',
            'district_admin',
            'analytics',
          ],
        },
      });
      chtScriptApiService.init();

      const result = await service.has(['']);

      expect(result).to.be.false;
    });

    it('should throw error when server is offline', async () => {
      settingsService.get.rejects({ status: 503 });
      chtScriptApiService.init();
      try {
        await service.has(['']);
        expect.fail();
      } catch (err) {
        expect(err).to.deep.equal({ status: 503 });
      }
    });

    describe('unconfigured permissions', () => {

      // Unconfigured permissions should behave the same as having the permission
      // configured to false

      it('should return false when unknown permission', async () => {
        sessionService.userCtx.returns({ roles: ['district_admin'] });
        settingsService.get.resolves({
          permissions: {
            can_backup_facilities: ['national_admin'],
            can_export_messages: [
              'national_admin',
              'district_admin',
              'analytics',
            ],
          },
        });
        chtScriptApiService.init();

        const result = await service.has(['xyz']);

        expect(result).to.be.false;
      });

      it('should return true when !unknown permission', async () => {
        sessionService.userCtx.returns({ roles: ['district_admin'] });
        settingsService.get.resolves({
          permissions: {
            can_backup_facilities: ['national_admin'],
            can_export_messages: [
              'national_admin',
              'district_admin',
              'analytics',
            ],
          },
        });
        chtScriptApiService.init();

        const result = await service.has(['!xyz']);

        expect(result).to.be.true;
      });

    });

    it('should return false when user does not have permission', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_export_messages: [
            'national_admin',
            'district_admin',
            'analytics',
          ],
        },
      });
      chtScriptApiService.init();

      const result = await service.has('can_backup_facilities');

      expect(result).to.be.false;
    });

    it('should return false when user does not have all permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_export_messages: [
            'national_admin',
            'district_admin',
            'analytics',
          ],
        },
      });
      chtScriptApiService.init();

      const result = await service.has(['can_backup_facilities', 'can_export_messages']);

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions', async () => {
      sessionService.userCtx.returns({ roles: ['national_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_export_messages: [
            'national_admin',
            'district_admin',
            'analytics',
          ],
        },
      });
      chtScriptApiService.init();

      const result = await service.has(['can_backup_facilities', 'can_export_messages']);

      expect(result).to.be.true;
    });

    it('should return false when admin and !permission', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      settingsService.get.resolves({ permissions: {} });
      chtScriptApiService.init();

      const result = await service.has(['!can_backup_facilities']);

      expect(result).to.be.false;
    });

    it('should rejects when user has one of the !permissions', async () => {
      sessionService.userCtx.returns({ roles: ['analytics'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_export_messages: [
            'national_admin',
            'district_admin',
            'analytics',
          ],
        },
      });
      chtScriptApiService.init();

      const result = await service.has(['!can_backup_facilities', '!can_export_messages']);

      expect(result).to.be.false;
    });

    it('should return true when user has none of the !permissions', async () => {
      sessionService.userCtx.returns({ roles: ['analytics'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_export_messages: [
            'national_admin',
            'district_admin',
            'analytics',
          ],
        },
      });
      chtScriptApiService.init();

      const result = await service.has(['!can_backup_facilities', 'can_export_messages']);

      expect(result).to.be.true;
    });
  });

  describe('authService.any', () => {
    it('should return false when no settings', async () => {
      sessionService.userCtx.returns({ roles: ['chw'] });
      settingsService.get.resolves(null);
      chtScriptApiService.init();

      const result = await service.any([['can_edit'], ['can_configure']]);

      expect(result).to.be.false;
    });

    it('should return false when no settings and no permissions configured', async () => {
      sessionService.userCtx.returns({ roles: ['chw'] });
      settingsService.get.resolves({});
      chtScriptApiService.init();

      const result = await service.any([['can_edit'], ['can_configure']]);

      expect(result).to.be.false;
    });

    it('should return false when no session', async () => {
      sessionService.userCtx.returns(null);
      settingsService.get.resolves({ permissions: {} });
      chtScriptApiService.init();

      const result = await service.any();

      expect(result).to.be.false;
    });

    it('should return false when user has no role', async () => {
      sessionService.userCtx.returns({});
      settingsService.get.resolves({ permissions: {} });
      chtScriptApiService.init();

      const result = await service.any();

      expect(result).to.be.false;
    });

    it('should return true when admin and no disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      settingsService.get.resolves({ permissions: { can_edit: [ 'chw' ] } });
      chtScriptApiService.init();

      const result = await service.any([['can_backup_facilities'], ['can_export_messages'], ['somepermission']]);

      expect(result).to.be.true;
    });

    it('should return true when admin and some disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      settingsService.get.resolves({ permissions: { can_edit: [ 'chw' ] } });
      chtScriptApiService.init();

      const result = await service.any([['!can_backup_facilities'], ['!can_export_messages'], ['somepermission']]);

      expect(result).to.be.true;
    });

    it('should return false when admin and all disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      settingsService.get.resolves({ permissions: {} });
      chtScriptApiService.init();

      const result = await service.any([['!can_backup_facilities'], ['!can_export_messages'], ['!somepermission']]);

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin', 'district_admin'],
          can_export_messages: [
            'national_admin',
            'district_admin',
            'analytics',
          ],
          can_add_people: ['national_admin', 'district_admin'],
          can_add_places: ['national_admin', 'district_admin'],
          can_roll_over: ['national_admin', 'district_admin'],
        },
      });
      chtScriptApiService.init();
      const permissions = [
        ['can_backup_facilities'],
        ['can_export_messages', 'can_roll_over'],
        ['can_add_people', 'can_add_places'],
      ];

      const result = await service.any(permissions);

      expect(result).to.be.true;
    });

    it('should return true when user has some permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin', 'district_admin'],
          can_backup_people: ['national_admin', 'district_admin'],
        },
      });
      chtScriptApiService.init();
      const permissions = [
        ['can_backup_facilities', 'can_backup_people'],
        ['can_export_messages', 'can_roll_over'],
        ['can_add_people', 'can_add_places']
      ];

      const result = await service.any(permissions);

      expect(result).to.be.true;
    });

    it('should return false when user has none of the permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_backup_people: ['national_admin'],
        },
      });
      chtScriptApiService.init();
      const permissions = [
        ['can_backup_facilities', 'can_backup_people'],
        ['can_export_messages', 'can_roll_over'],
        ['can_add_people', 'can_add_places']
      ];

      const result = await service.any(permissions);

      expect(result).to.be.false;
    });

    it('should return true when user has all permissions and no disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin', 'district_admin'],
          can_export_messages: [
            'national_admin',
            'district_admin',
            'analytics',
          ],
          can_add_people: ['national_admin', 'district_admin'],
          random1: ['national_admin'],
          random2: ['national_admin'],
          random3: ['national_admin'],
        },
      });
      chtScriptApiService.init();

      const result = await service.any([
        ['can_backup_facilities', '!random1'],
        ['can_export_messages', '!random2'],
        ['can_add_people', '!random3']
      ]);

      expect(result).to.be.true;
    });

    it('should return true when user has some permissions and some disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin', 'district_admin'],
          can_backup_people: ['national_admin', 'district_admin'],
          can_add_people: ['national_admin'],
          can_add_places: ['national_admin'],
          random1: ['national_admin'],
          random3: ['national_admin'],
        },
      });
      chtScriptApiService.init();

      const result = await service.any([
        ['can_backup_facilities', '!can_add_people'],
        ['can_export_messages', '!random2'],
        ['can_backup_people', '!can_add_places']
      ]);
      chtScriptApiService.init();

      expect(result).to.be.true;
    });

    it('should return false when user has all disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin', 'district_admin'],
          can_backup_people: ['national_admin', 'district_admin'],
          can_backup_places: ['national_admin', 'district_admin'],
          random1: ['national_admin', 'district_admin'],
          random2: ['national_admin', 'district_admin'],
          random3: ['national_admin', 'district_admin'],
        },
      });
      chtScriptApiService.init();

      const result = await service.any([
        ['can_backup_facilities', '!random1'],
        ['can_backup_people', '!random2'],
        ['can_backup_places', '!random3']
      ]);

      expect(result).to.be.false;
    });
  });

  describe('authService.online', () => {
    it('should rejects when no session', () => {
      sessionService.userCtx.returns(null);

      const result = service.online(true);

      expect(result).to.be.false;
      expect(sessionService.isOnlineOnly.callCount).to.equal(0);
    });

    it('should return true when requesting online and user is online', () => {
      sessionService.userCtx.returns({ roles: ['a'] });
      sessionService.isOnlineOnly.returns(true);

      const result = service.online(true);

      expect(result).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
    });

    it('should return true when requesting offline and user is offline', () => {
      sessionService.userCtx.returns({ roles: ['a'] });
      sessionService.isOnlineOnly.returns(false);

      const result = service.online(false);

      expect(result).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
    });

    it('should return false when requesting online and user is offline', () => {
      sessionService.userCtx.returns({ roles: ['a', 'b'] });
      sessionService.isOnlineOnly.returns(false);

      const result = service.online(true);

      expect(result).to.be.false;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
    });

    it('should return false when requesting offline and user is online', () => {
      sessionService.userCtx.returns({ roles: ['a', 'b'] });
      sessionService.isOnlineOnly.returns(true);

      const result = service.online(false);

      expect(result).to.be.false;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
    });

    it('should accept any kind of truthy input', () => {
      sessionService.userCtx.returns({ roles: ['a'] });
      sessionService.isOnlineOnly.returns(true);

      expect(service.online('yes')).to.be.true;
      expect(service.online('true')).to.be.true;
      expect(service.online(['something'])).to.be.true;
      expect(service.online({ foo: 'bar' })).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(4);
    });

    it('should accept any kind of input falsey input', () => {
      sessionService.userCtx.returns({ roles: ['a'] });
      sessionService.isOnlineOnly.returns(false);

      expect(service.online()).to.be.true;
      expect(service.online(undefined)).to.be.true;
      expect(service.online(null)).to.be.true;
      expect(service.online(0)).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(4);
    });
  });
});
