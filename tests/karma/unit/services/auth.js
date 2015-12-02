describe('Auth service', function() {

  'use strict';

  var service,
      userCtx,
      Settings,
      $rootScope;

  beforeEach(function () {
    module('inboxApp');
    userCtx = sinon.stub();
    Settings = sinon.stub();
    module(function ($provide) {
      $provide.factory('Session', function() {
        return { userCtx: userCtx };
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
    Settings.callsArgWith(0, 'boom');
    service([ 'can_backup_facilities' ])
      .catch(function(err) {
        chai.expect(err).to.equal('boom');
        done();
      });
    $rootScope.$digest();
  });

  it('rejects when unknown permission', function(done) {
    userCtx.returns({ roles: [ 'district_admin' ] });
    Settings.callsArgWith(0, null, { permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] });
    service([ 'xyz' ])
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    $rootScope.$digest();
  });

  it('rejects when user does not have permission', function(done) {
    userCtx.returns({ roles: [ 'district_admin' ] });
    Settings.callsArgWith(0, null, { permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] });
    service('can_backup_facilities')
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    $rootScope.$digest();
  });

  it('rejects when user does not have all permissions', function(done) {
    userCtx.returns({ roles: [ 'district_admin' ] });
    Settings.callsArgWith(0, null, { permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] });
    service([ 'can_backup_facilities', 'can_export_messages' ])
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    $rootScope.$digest();
  });

  it('resolves when user has all permissions', function(done) {
    userCtx.returns({ roles: [ 'national_admin' ] });
    Settings.callsArgWith(0, null, { permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] });
    service([ 'can_backup_facilities', 'can_export_messages' ]).then(done);
    $rootScope.$digest();
  });

  it('rejects when admin and !permission', function(done) {
    userCtx.returns({ roles: [ '_admin' ] });
    service([ '!can_backup_facilities' ])
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    $rootScope.$digest();
  });

  it('rejects when user has one of the !permissions', function(done) {
    userCtx.returns({ roles: [ 'analytics' ] });
    Settings.callsArgWith(0, null, { permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] });
    service([ '!can_backup_facilities', '!can_export_messages' ])
      .catch(function(err) {
        chai.expect(err).to.equal(undefined);
        done();
      });
    $rootScope.$digest();
  });

  it('resolves when user has none of the !permissions', function(done) {
    userCtx.returns({ roles: [ 'analytics' ] });
    Settings.callsArgWith(0, null, { permissions: [
      { name: 'can_backup_facilities', roles: ['national_admin'] },
      { name: 'can_export_messages', roles: [ 'national_admin', 'district_admin', 'analytics' ] }
    ] });
    service([ '!can_backup_facilities', 'can_export_messages' ])
      .then(done)
      .catch(function() {
        done('Should have passed auth');
      });
    $rootScope.$digest();
  });
});