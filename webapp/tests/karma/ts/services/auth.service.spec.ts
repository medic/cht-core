import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { AuthService } from '@mm-services/auth.service';

describe('Auth Service', () => {
  let service:AuthService;
  let sessionService;
  let settingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionService, useValue: { userCtx: sinon.stub(), isOnlineOnly: sinon.stub() } },
        { provide: SettingsService, useValue: { get: sinon.stub() } },
      ]
    });

    service = TestBed.inject(AuthService);
    sessionService = TestBed.inject(SessionService);
    settingsService = TestBed.inject(SettingsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('has', () => {
    it('false when no session', async () => {
      sessionService.userCtx.returns(null);
      const result = await service.has();
      expect(result).to.be.false;
    });

    it('false when user has no role', async () => {
      sessionService.userCtx.returns({});
      const result = await service.has();
      expect(result).to.be.false;
    });

    it('true when user is db admin', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      const result = await service.has(['can_backup_facilities']);
      expect(result).to.be.true;
    });

    it('false when settings errors', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.rejects('boom');
      const result = await service.has(['can_backup_facilities']);
      expect(result).to.be.false;
    });

    it('false when perm is empty string', async () => {
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

      const result = await service.has(['']);
      expect(result).to.be.false;
    });

    describe('unconfigured permissions', () => {

      // Unconfigured permissions should behave the same as having the permission
      // configured to false

      it('false when unknown permission', async () => {
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
        const result = await service.has(['xyz']);
        expect(result).to.be.false;
      });

      it('true when !unknown permission', async () => {
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
        const result = await service.has(['!xyz']);
        expect(result).to.be.true;
      });

    });

    it('false when user does not have permission', async () => {
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
      const result = await service.has('can_backup_facilities');
      expect(result).to.be.false;
    });

    it('false when user does not have all permissions', async () => {
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
      const result = await service.has(['can_backup_facilities', 'can_export_messages']);
      expect(result).to.be.false;
    });

    it('true when user has all permissions', async () => {
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
      const result = await service.has(['can_backup_facilities', 'can_export_messages']);
      expect(result).to.be.true;
    });

    it('false when admin and !permission', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      const result = await service.has(['!can_backup_facilities']);
      expect(result).to.be.false;
    });

    it('rejects when user has one of the !permissions', async () => {
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

      const result = await service.has(['!can_backup_facilities', '!can_export_messages']);
      expect(result).to.be.false;
    });

    it('true when user has none of the !permissions', async () => {
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

      const result = await service.has(['!can_backup_facilities', 'can_export_messages']);
      expect(result).to.be.true;
    });
  });

  describe('Auth.any', () => {
    it('false when no session', async () => {
      sessionService.userCtx.returns(null);
      const result = await service.any();
      expect(result).to.be.false;
    });

    it('false when user has no role', async () => {
      sessionService.userCtx.returns({});
      const result = await service.any();
      expect(result).to.be.false;
    });

    it('true when admin and no disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      const result = await service.any([['can_backup_facilities'], ['can_export_messages'], ['somepermission']]);
      expect(result).to.be.true;
    });

    it('true when admin and some disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      const result = await service.any([['!can_backup_facilities'], ['!can_export_messages'], ['somepermission']]);
      expect(result).to.be.true;
    });

    it('false when admin and all disallowed permissions', async () => {
      sessionService.userCtx.returns({ roles: ['_admin'] });
      const result = await service.any([['!can_backup_facilities'], ['!can_export_messages'], ['!somepermission']]);
      expect(result).to.be.false;
    });

    it('true when user has all permissions', async () => {
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
      const permissions = [
        ['can_backup_facilities'],
        ['can_export_messages', 'can_roll_over'],
        ['can_add_people', 'can_add_places'],
      ];
      const result = await service.any(permissions);
      expect(result).to.be.true;
    });

    it('true when user has some permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin', 'district_admin'],
          can_backup_people: ['national_admin', 'district_admin'],
        },
      });

      const permissions = [
        ['can_backup_facilities', 'can_backup_people'],
        ['can_export_messages', 'can_roll_over'],
        ['can_add_people', 'can_add_places']
      ];
      const result = await service.any(permissions);
      expect(result).to.be.true;
    });

    it('false when user has none of the permissions', async () => {
      sessionService.userCtx.returns({ roles: ['district_admin'] });
      settingsService.get.resolves({
        permissions: {
          can_backup_facilities: ['national_admin'],
          can_backup_people: ['national_admin'],
        },
      });
      const permissions = [
        ['can_backup_facilities', 'can_backup_people'],
        ['can_export_messages', 'can_roll_over'],
        ['can_add_people', 'can_add_places']
      ];
      const result = await service.any(permissions);
      expect(result).to.be.false;
    });

    it('true when user has all permissions and no disallowed permissions', async () => {
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

      const result = await service.any([
        ['can_backup_facilities', '!random1'],
        ['can_export_messages', '!random2'],
        ['can_add_people', '!random3']
      ]);
      expect(result).to.be.true;
    });

    it('true when user has some permissions and some disallowed permissions', async () => {
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
      const result = await service.any([
        ['can_backup_facilities', '!can_add_people'],
        ['can_export_messages', '!random2'],
        ['can_backup_people', '!can_add_places']
      ]);
      expect(result).to.be.true;
    });

    it('false when user has all disallowed permissions', async () => {
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

      const result = await service.any([
        ['can_backup_facilities', '!random1'],
        ['can_backup_people', '!random2'],
        ['can_backup_places', '!random3']
      ]);
      expect(result).to.be.false;
    });
  });

  describe('Auth.online', () => {
    it('rejects when no session', () => {
      sessionService.userCtx.returns(null);
      const result = service.online(true);
      expect(result).to.be.false;
      expect(sessionService.isOnlineOnly.callCount).to.equal(0);
    });

    it('true when requesting online and user is online', () => {
      sessionService.userCtx.returns({ roles: ['a'] });
      sessionService.isOnlineOnly.returns(true);

      const result = service.online(true);
      expect(result).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
    });

    it('true when requesting offline and user is offline', () => {
      sessionService.userCtx.returns({ roles: ['a'] });
      sessionService.isOnlineOnly.returns(false);

      const result = service.online(false);
      expect(result).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
    });

    it('false when requesting online and user is offline', () => {
      sessionService.userCtx.returns({ roles: ['a', 'b'] });
      sessionService.isOnlineOnly.returns(false);

      const result = service.online(true);
      expect(result).to.be.false;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
    });

    it('false when requesting offline and user is online', () => {
      sessionService.userCtx.returns({ roles: ['a', 'b'] });
      sessionService.isOnlineOnly.returns(true);

      const result = service.online(false);
      expect(result).to.be.false;
      expect(sessionService.isOnlineOnly.callCount).to.equal(1);
      expect(sessionService.isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
    });

    it('accept any kind of truthy input', () => {
      sessionService.userCtx.returns({ roles: ['a'] });
      sessionService.isOnlineOnly.returns(true);

      expect(service.online('yes')).to.be.true;
      expect(service.online('true')).to.be.true;
      expect(service.online(['something'])).to.be.true;
      expect(service.online({ foo: 'bar' })).to.be.true;
      expect(sessionService.isOnlineOnly.callCount).to.equal(4);
    });

    it('accept any kind of input falsey input', () => {
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
