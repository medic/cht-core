describe('Auth service', function() {

  'use strict';

  let service;
  let userCtx;
  let Settings;
  let isOnlineOnly;

  beforeEach(function () {
    module('adminApp');
    userCtx = sinon.stub();
    Settings = sinon.stub();
    isOnlineOnly = sinon.stub();
    module(function ($provide) {
      $provide.factory('Session', function() {
        return { userCtx: userCtx, isOnlineOnly: isOnlineOnly };
      });
      $provide.factory('Settings', function() {
        return Settings;
      });
    });
    inject(function($injector) {
      service = $injector.get('Auth');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(userCtx, Settings);
  });

  describe('has', () => {
    it('should return false when no settings and no permissions configured.', async () => {
      userCtx.returns({ roles: ['chw'] });

      Settings.resolves(null);
      const resultNoSettings = await service.has('can_edit');

      Settings.resolves({});
      const resultNoPermissions = await service.has('can_edit');

      chai.expect(resultNoSettings).to.be.false;
      chai.expect(resultNoPermissions).to.be.false;
    });

    it('false when no session', async () => {
      userCtx.returns(null);
      Settings.resolves({ permissions: {} });
      const result = await service.has();
      chai.expect(result).to.be.false;
    });

    it('false when user has no role', async () => {
      userCtx.returns({});
      Settings.resolves({ permissions: {} });
      const result = await service.has();
      chai.expect(result).to.be.false;
    });

    it('true when user is db admin', async () => {
      userCtx.returns({ roles: ['_admin'] });
      Settings.resolves({ permissions: { can_edit: [ 'chw' ] } });
      const result = await service.has(['can_backup_facilities']);
      chai.expect(result).to.be.true;
    });

    it('false when settings errors', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.returns(Promise.reject('boom'));
      const result = await service.has(['can_backup_facilities']);
      chai.expect(result).to.be.false;
    });

    it('false when perm is empty string', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.false;
    });

    describe('unconfigured permissions', function() {

      // Unconfigured permissions should be have the same as having the permission
      // configured to false

      it('false when unknown permission', async () => {
        userCtx.returns({ roles: ['district_admin'] });
        Settings.resolves({
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
        chai.expect(result).to.be.false;
      });

      it('true when !unknown permission', async () => {
        userCtx.returns({ roles: ['district_admin'] });
        Settings.resolves({
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
        chai.expect(result).to.be.true;
      });

    });

    it('false when user does not have permission', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.false;
    });

    it('false when user does not have all permissions', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.false;
    });

    it('true when user has all permissions', async () => {
      userCtx.returns({ roles: ['national_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.true;
    });

    it('false when admin and !permission', async () => {
      userCtx.returns({ roles: ['_admin'] });
      Settings.resolves({ permissions: {} });
      const result = await service.has(['!can_backup_facilities']);
      chai.expect(result).to.be.false;
    });

    it('rejects when user has one of the !permissions', async () => {
      userCtx.returns({ roles: ['analytics'] });
      Settings.resolves({
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
      chai.expect(result).to.be.false;
    });

    it('true when user has none of the !permissions', async () => {
      userCtx.returns({ roles: ['analytics'] });
      Settings.resolves({
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
      chai.expect(result).to.be.true;
    });
  });

  describe('Auth.any', () => {
    it('should return false when no settings and no permissions configured.', async () => {
      userCtx.returns({ roles: ['chw'] });

      Settings.resolves(null);
      const resultNoSettings = await service.any([['can_edit'], ['can_configure']]);

      Settings.resolves({});
      const resultNoPermissions = await service.any([['can_edit'], ['can_configure']]);

      chai.expect(resultNoSettings).to.be.false;
      chai.expect(resultNoPermissions).to.be.false;
    });

    it('false when no session', async () => {
      userCtx.returns(null);
      Settings.resolves({ permissions: {} });
      const result = await service.any();
      chai.expect(result).to.be.false;
    });

    it('false when user has no role', async () => {
      userCtx.returns({});
      Settings.resolves({ permissions: {} });
      const result = await service.any();
      chai.expect(result).to.be.false;
    });

    it('true when admin and no disallowed permissions', async () => {
      userCtx.returns({ roles: ['_admin'] });
      Settings.resolves({ permissions: { can_edit: [ 'chw' ] } });
      const result = await service.any([['can_backup_facilities'], ['can_export_messages'], ['somepermission']]);
      chai.expect(result).to.be.true;
    });

    it('true when admin and some disallowed permissions', async () => {
      userCtx.returns({ roles: ['_admin'] });
      Settings.resolves({ permissions: { can_edit: [ 'chw' ] } });
      const result = await service.any([['!can_backup_facilities'], ['!can_export_messages'], ['somepermission']]);
      chai.expect(result).to.be.true;
    });

    it('false when admin and all disallowed permissions', async () => {
      userCtx.returns({ roles: ['_admin'] });
      Settings.resolves({ permissions: {} });
      const result = await service.any([['!can_backup_facilities'], ['!can_export_messages'], ['!somepermission']]);
      chai.expect(result).to.be.false;
    });

    it('true when user has all permissions', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.true;
    });

    it('true when user has some permissions', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.true;
    });

    it('false when user has none of the permissions', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.false;
    });

    it('true when user has all permissions and no disallowed permissions', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.true;
    });

    it('true when user has some permissions and some disallowed permissions', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.true;
    });

    it('false when user has all disallowed permissions', async () => {
      userCtx.returns({ roles: ['district_admin'] });
      Settings.resolves({
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
      chai.expect(result).to.be.false;
    });
  });

  describe('Auth.online', () => {
    it('rejects when no session', () => {
      userCtx.returns(null);
      const result = service.online(true);
      chai.expect(result).to.be.false;
      chai.expect(isOnlineOnly.callCount).to.equal(0);
    });

    it('true when requesting online and user is online', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(true);

      const result = service.online(true);
      chai.expect(result).to.be.true;
      chai.expect(isOnlineOnly.callCount).to.equal(1);
      chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
    });

    it('true when requesting offline and user is offline', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(false);

      const result = service.online(false);
      chai.expect(result).to.be.true;
      chai.expect(isOnlineOnly.callCount).to.equal(1);
      chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
    });

    it('false when requesting online and user is offline', () => {
      userCtx.returns({ roles: ['a', 'b'] });
      isOnlineOnly.returns(false);

      const result = service.online(true);
      chai.expect(result).to.be.false;
      chai.expect(isOnlineOnly.callCount).to.equal(1);
      chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
    });

    it('false when requesting offline and user is online', () => {
      userCtx.returns({ roles: ['a', 'b'] });
      isOnlineOnly.returns(true);

      const result = service.online(false);
      chai.expect(result).to.be.false;
      chai.expect(isOnlineOnly.callCount).to.equal(1);
      chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
    });

    it('accept any kind of truthy input', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(true);

      chai.expect(service.online('yes')).to.be.true;
      chai.expect(service.online('true')).to.be.true;
      chai.expect(service.online(['something'])).to.be.true;
      chai.expect(service.online({ foo: 'bar' })).to.be.true;
      chai.expect(isOnlineOnly.callCount).to.equal(4);
    });

    it('accept any kind of input falsey input', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(false);

      chai.expect(service.online()).to.be.true;
      chai.expect(service.online(undefined)).to.be.true;
      chai.expect(service.online(null)).to.be.true;
      chai.expect(service.online(0)).to.be.true;
      chai.expect(isOnlineOnly.callCount).to.equal(4);
    });
  });
});
