describe('Auth service', function() {

  'use strict';

  var service,
      userCtx,
      Settings,
      $rootScope,
      isOnlineOnly;

  beforeEach(function () {
    module('inboxApp');
    userCtx = sinon.stub();
    Settings = sinon.stub();
    isOnlineOnly = sinon.stub();
    module(function ($provide) {
      $provide.value('$q', Q);
      $provide.factory('Session', function() {
        return { userCtx: userCtx, isOnlineOnly: isOnlineOnly };
      });
      $provide.factory('Settings', function() {
        return Settings;
      });
    });
    inject(function($injector, _$rootScope_) {
      $rootScope = _$rootScope_;
      service = $injector.get('Auth');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(userCtx, Settings);
  });

  it('rejects when no session', function(done) {
    userCtx.returns(null);
    service()
      .catch(function(err) {
        chai.expect(err.message).to.equal('Not logged in');
        done();
      });
    $rootScope.$digest();
  });

  it('rejects when user has no role', function(done) {
    userCtx.returns({});
    service()
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    $rootScope.$digest();
  });

  it('resolves when user is db admin', function(done) {
    userCtx.returns({ roles: [ '_admin' ] });
    service([ 'can_backup_facilities' ]).then(done);
    $rootScope.$digest();
  });

  it('rejects when settings errors', function(done) {
    userCtx.returns({ roles: [ 'district_admin' ] });
    Settings.returns(Promise.reject('boom'));
    service([ 'can_backup_facilities' ])
      .catch(function(err) {
        chai.expect(err).to.equal('boom');
        done();
      });
    $rootScope.$digest();
  });

  it('rejects when perm is empty string', function(done) {
    userCtx.returns({ roles: [ 'district_admin' ] });
    Settings.returns(Promise.resolve({ permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] }));
    service([ '' ])
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  describe('unconfigured permissions', function() {

    // Unconfigured permissions should be have the same as having the permission
    // configured to false

    it('rejects when unknown permission', function(done) {
      userCtx.returns({ roles: [ 'district_admin' ] });
      Settings.returns(Promise.resolve({ permissions: [
        { name: 'can_backup_facilities', roles: ['national_admin'] },
        { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
      ] }));
      service([ 'xyz' ])
        .catch(function(err) {
          chai.expect(err).to.equal(undefined);
          done();
        });
      setTimeout(function() {
        $rootScope.$digest();
      });
    });

    it('resolves when !unknown permission', function(done) {
      userCtx.returns({ roles: [ 'district_admin' ] });
      Settings.returns(Promise.resolve({ permissions: [
        { name: 'can_backup_facilities', roles: ['national_admin'] },
        { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
      ] }));
      service([ '!xyz' ]).then(done);
      setTimeout(function() {
        $rootScope.$digest();
      });
    });

  });

  it('rejects when user does not have permission', function(done) {
    userCtx.returns({ roles: [ 'district_admin' ] });
    Settings.returns(Promise.resolve({ permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] }));
    service('can_backup_facilities')
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('rejects when user does not have all permissions', function(done) {
    userCtx.returns({ roles: [ 'district_admin' ] });
    Settings.returns(Promise.resolve({ permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] }));
    service([ 'can_backup_facilities', 'can_export_messages' ])
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('resolves when user has all permissions', function(done) {
    userCtx.returns({ roles: [ 'national_admin' ] });
    Settings.returns(Promise.resolve({ permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] }));
    service([ 'can_backup_facilities', 'can_export_messages' ]).then(done);
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('rejects when admin and !permission', function(done) {
    userCtx.returns({ roles: [ '_admin' ] });
    service([ '!can_backup_facilities' ])
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('rejects when user has one of the !permissions', function(done) {
    userCtx.returns({ roles: [ 'analytics' ] });
    Settings.returns(Promise.resolve({ permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] }));
    service([ '!can_backup_facilities', '!can_export_messages' ])
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  it('resolves when user has none of the !permissions', function(done) {
    userCtx.returns({ roles: [ 'analytics' ] });
    Settings.returns(Promise.resolve({ permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] }));
    service([ '!can_backup_facilities', 'can_export_messages' ])
      .then(done)
      .catch(function() {
        done('Should have passed auth');
      });
    setTimeout(function() {
      $rootScope.$digest();
    });
  });

  describe('Auth.any', () => {
    it('rejects when no session', () => {
      userCtx.returns(null);
      return service
        .any()
        .catch((err) => {
          chai.expect(err.message).to.equal('Not logged in');
        });
    });

    it('rejects when user has no role', () => {
      userCtx.returns({});
      return service
        .any()
        .catch(function(err) {
          chai.expect(err).to.equal(undefined);
        });
    });

    it('resolves when admin and no disallowed permissions', () => {
      userCtx.returns({ roles: [ '_admin' ] });
      return service.any([[ 'can_backup_facilities' ], [ 'can_export_messages' ], [ 'somepermission' ]]);
    });

    it('resolves when admin and some disallowed permissions', () => {
      userCtx.returns({ roles: [ '_admin' ] });
      return service
        .any([[ '!can_backup_facilities' ], [ '!can_export_messages' ], [ 'somepermission' ]]);
    });

    it('rejects when admin and all disallowed permissions', () => {
      userCtx.returns({ roles: [ '_admin' ] });
      return service
        .any([[ '!can_backup_facilities' ], [ '!can_export_messages' ], [ '!somepermission' ]])
        .then(() => {
          throw new Error('Expect error to be thrown');
        })
        .catch((err) => {
          chai.expect(err).to.equal(undefined);
        });
    });

    it('resolves when user has all permissions', () => {
      userCtx.returns({ roles: [ 'district_admin' ] });
      Settings.returns(Promise.resolve({ permissions: [
          { name: 'can_backup_facilities', roles: ['national_admin', 'district_admin'] },
          { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] },
          { name: 'can_add_people', roles: [ 'national_admin', 'district_admin' ] },
          { name: 'can_add_places', roles: [ 'national_admin', 'district_admin' ] },
          { name: 'can_roll_over', roles: [ 'national_admin', 'district_admin' ] }
        ] }));
      return service
        .any([[ 'can_backup_facilities' ], [ 'can_export_messages', 'can_roll_over' ], [ 'can_add_people', 'can_add_places' ]])
        .catch(() => {
          throw new Error('Should have passed auth');
        });
    });

    it('resolves when user has some permissions', () => {
      userCtx.returns({ roles: [ 'district_admin' ] });
      Settings.returns(Promise.resolve({ permissions: [
          { name: 'can_backup_facilities', roles: ['national_admin', 'district_admin'] },
          { name: 'can_backup_people', roles: ['national_admin', 'district_admin'] },
        ] }));
      return service
        .any([[ 'can_backup_facilities', 'can_backup_people' ], [ 'can_export_messages', 'can_roll_over' ], [ 'can_add_people', 'can_add_places' ]])
        .catch(() => {
          throw new Error('Should have passed auth');
        });
    });

    it('rejects when user has none of the permissions', () => {
      userCtx.returns({ roles: [ 'district_admin' ] });
      Settings.returns(Promise.resolve({ permissions: [
          { name: 'can_backup_facilities', roles: ['national_admin'] },
          { name: 'can_backup_people', roles: ['national_admin'] },
        ] }));
      return service
        .any([[ 'can_backup_facilities', 'can_backup_people' ], [ 'can_export_messages', 'can_roll_over' ], [ 'can_add_people', 'can_add_places' ]])
        .then(() => {
          throw new Error('Should have failed auth');
        })
        .catch(err => {
          chai.expect(err).to.equal(undefined);
        });
    });

    it('resolves when user has all permissions and no disallowed permissions', () => {
      userCtx.returns({ roles: [ 'district_admin' ] });
      Settings.returns(Promise.resolve({ permissions: [
          { name: 'can_backup_facilities', roles: ['national_admin', 'district_admin'] },
          { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] },
          { name: 'can_add_people', roles: [ 'national_admin', 'district_admin' ] },
          { name: 'random1', roles: [ 'national_admin' ] },
          { name: 'random2', roles: [ 'national_admin' ] },
          { name: 'random3', roles: [ 'national_admin' ] },
        ] }));
      return service
        .any([[ 'can_backup_facilities', '!random1' ], [ 'can_export_messages', '!random2' ], [ 'can_add_people', '!random3' ]])
        .catch(() => {
          throw new Error('Should have passed auth');
        });
    });

    it('resolves when user has some permissions and some disallowed permissions', () => {
      userCtx.returns({ roles: [ 'district_admin' ] });
      Settings.returns(Promise.resolve({ permissions: [
          { name: 'can_backup_facilities', roles: ['national_admin', 'district_admin'] },
          { name: 'can_backup_people', roles: ['national_admin', 'district_admin'] },
          { name: 'can_add_people', roles: [ 'national_admin' ] },
          { name: 'can_add_places', roles: [ 'national_admin' ] },
          { name: 'random1', roles: [ 'national_admin' ] },
          { name: 'random3', roles: [ 'national_admin' ] },
        ] }));
      service
        .any([[ 'can_backup_facilities', '!can_add_people' ], [ 'can_export_messages', '!random2' ], [ 'can_backup_people', '!can_add_places' ]])
        .catch(() => {
          throw new Error('Should have passed auth');
        });
    });

    it('rejects when user has all disallowed permissions', () => {
      userCtx.returns({ roles: [ 'district_admin' ] });
      Settings.returns(Promise.resolve({ permissions: [
          { name: 'can_backup_facilities', roles: ['national_admin', 'district_admin'] },
          { name: 'can_backup_people', roles: ['national_admin', 'district_admin'] },
          { name: 'can_backup_places', roles: ['national_admin', 'district_admin'] },
          { name: 'random1', roles: [ 'national_admin', 'district_admin' ] },
          { name: 'random2', roles: [ 'national_admin', 'district_admin' ] },
          { name: 'random3', roles: [ 'national_admin', 'district_admin' ] }
        ] }));
      return service
        .any([[ 'can_backup_facilities', '!random1' ], [ 'can_backup_people', '!random2' ], [ 'can_backup_places', '!random3' ]])
        .then(() => {
          throw new Error('Should have failed auth');
        })
        .catch(err => {
          chai.expect(err).to.equal(undefined);
        });
    });
  });

  describe('Auth.online', () => {
    it('rejects when no session', () => {
      userCtx.returns(null);
      return service
        .online(true)
        .catch(err => {
          chai.expect(err.message).to.equal('Not logged in');
          chai.expect(isOnlineOnly.callCount).to.equal(0);
        });
    });

    it('should resolve when requesting online and user is online', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(true);

      return service
        .online(true)
        .then(() => {
          chai.expect(isOnlineOnly.callCount).to.equal(1);
          chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
        })
        .catch(() => chai.expect(true).to.equal('Should have passed auth'));
    });

    it('should resolve when requesting offline and user is offline', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(false);

      return service
        .online(false)
        .then(() => {
          chai.expect(isOnlineOnly.callCount).to.equal(1);
          chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a'] }]);
        })
        .catch(() => chai.expect(true).to.equal('Should have passed auth'));
    });

    it('should reject when requesting online and user is offline', () => {
      userCtx.returns({ roles: ['a', 'b'] });
      isOnlineOnly.returns(false);

      return service
        .online(true)
        .then(() => chai.expect(true).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.equal(undefined);
          chai.expect(isOnlineOnly.callCount).to.equal(1);
          chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
        });
    });

    it('should reject when requesting offline and user is online', () => {
      userCtx.returns({ roles: ['a', 'b'] });
      isOnlineOnly.returns(true);

      return service
        .online(false)
        .then(() => chai.expect(true).to.equal('Should have thrown'))
        .catch(err => {
          chai.expect(err).to.equal(undefined);
          chai.expect(isOnlineOnly.callCount).to.equal(1);
          chai.expect(isOnlineOnly.args[0]).to.deep.equal([{ roles: ['a', 'b'] }]);
        });
    });

    it('should accept any kind of input truthy input', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(true);

      return Promise
        .all([
          service.online('yes'),
          service.online('true'),
          service.online(['something']),
          service.online({ foo: 'bar' })
        ])
        .then(() => {
          chai.expect(isOnlineOnly.callCount).to.equal(4);
        })
        .catch(() => chai.expect(true).to.equal('Should have passed auth'));
    });

    it('should accept any kind of input falsey input', () => {
      userCtx.returns({ roles: ['a'] });
      isOnlineOnly.returns(false);

      return Promise
        .all([
          service.online(),
          service.online(undefined),
          service.online(null),
          service.online(0)
        ])
        .then(() => {
          chai.expect(isOnlineOnly.callCount).to.equal(4);
        })
        .catch(() => chai.expect(true).to.equal('Should have passed auth'));
    });
  });
});
