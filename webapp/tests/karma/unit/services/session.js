describe('Session service', function() {

  'use strict';

  var service,
      ipCookie,
      ipCookieRemove,
      location,
      appCache,
      appCacheListener,
      $httpBackend,
      Location;

  beforeEach(function () {
    module('inboxApp');
    ipCookie = sinon.stub();
    ipCookieRemove = sinon.stub();
    appCacheListener = sinon.stub();
    ipCookie.remove = ipCookieRemove;
    Location = {};
    location = {};
    appCache = {
      DOWNLOADING: 3,
      status: 0,
      addEventListener: appCacheListener
    };
    module(function ($provide) {
      $provide.factory('ipCookie', function() {
        return ipCookie;
      });
      $provide.value('Location', Location);
      $provide.factory('$window', function() {
        return {
          angular: { callbacks: [] },
          location: location,
          applicationCache: appCache
        };
      });
    });
    inject(function(_Session_, _$httpBackend_) {
      service = _Session_;
      $httpBackend = _$httpBackend_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(ipCookie, ipCookieRemove, appCacheListener);
  });

  it('gets the user context', function(done) {
    var expected = { name: 'bryan' };
    ipCookie.returns(expected);
    var actual = service.userCtx();
    chai.expect(actual).to.deep.equal(expected);
    chai.expect(ipCookie.args[0][0]).to.equal('userCtx');
    done();
  });

  it('logs out', function(done) {
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    $httpBackend
      .expect('DELETE', '/_session')
      .respond(200);
    service.logout();
    $httpBackend.flush();
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('logs out if no user context', function(done) {
    ipCookie.returns({});
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    $httpBackend
      .expect('DELETE', '/_session')
      .respond(200);
    service.init();
    $httpBackend.flush();
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('redirects to login if not logged in remotely', function(done) {
    ipCookie.returns({ name: 'bryan' });
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    $httpBackend
      .expect('GET', '/_session')
      .respond(401);
    service.init();
    $httpBackend.flush();
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('does not log out if server not found', function(done) {
    ipCookie.returns({ name: 'bryan' });
    $httpBackend
      .expect('GET', '/_session')
      .respond(0);
    service.init();
    $httpBackend.flush();
    chai.expect(ipCookieRemove.callCount).to.equal(0);
    done();
  });

  it('logs out if remote userCtx inconsistent', function(done) {
    ipCookie.returns({ name: 'bryan' });
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    $httpBackend
      .expect('GET', '/_session')
      .respond(200, { data: { userCtx: { name: 'jimmy' } } });
    $httpBackend
      .expect('DELETE', '/_session')
      .respond(200);
    service.init();
    $httpBackend.flush();
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('does not log out if remote userCtx consistent', function(done) {
    ipCookie.returns({ name: 'bryan' });
    $httpBackend
      .expect('GET', '/_session')
      .respond(200, { userCtx: { name: 'bryan' } });
    service.init();
    $httpBackend.flush();
    chai.expect(ipCookieRemove.callCount).to.equal(0);
    done();
  });

  it('waits for app cache download before logging out', function(done) {
    ipCookie.returns({});
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    $httpBackend
      .expect('DELETE', '/_session')
      .respond(200);
    appCache.status = 3;
    service.init();
    $httpBackend.flush();
    appCacheListener.args[0][1](); // fire the appcache callback
    chai.expect(appCacheListener.callCount).to.equal(1);
    chai.expect(appCacheListener.args[0][0]).to.equal('updateready');
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('refreshes user context cookie if a role change is detected', () => {
    ipCookie.returns({ name: 'adm', roles: ['alpha', 'omega'] });
    Location.dbName = 'DB_NAME';
    $httpBackend.when('GET', '/DB_NAME/login/identity').respond(200);
    $httpBackend.expect('GET', '/_session').respond(200, { userCtx: { name: 'adm', roles: ['beta'] } });
    $httpBackend.expect('GET', '/_session').respond(200, { userCtx: { name: 'adm', roles: ['beta'] } });
    $httpBackend.expect('GET', '/_session').respond(200, { userCtx: { name: 'adm', roles: ['beta'] } });
    $httpBackend.expect('GET', '/_session').respond(200, { userCtx: { name: 'adm', roles: ['alpha', 'omega', 'beta'] } });
    $httpBackend.expect('GET', '/_session').respond(200, { userCtx: { name: 'adm', roles: ['alpha'] } });
    const callback = sinon.stub();

    service.init(callback);
    service.init();
    service.init('something');
    service.init(callback);
    service.init(callback);

    $httpBackend.flush();
    chai.expect(callback.callCount).to.equal(3);
  });

  it('does not refresh user context if a role change is not detected', () => {
    ipCookie.returns({ name: 'adm', roles: ['beta'] });
    Location.dbName = 'DB_NAME';
    $httpBackend.expect('GET', '/_session').respond(200, { userCtx: { name: 'adm', roles: ['beta'] } });
    const callback = sinon.stub();

    service.init(callback);
    $httpBackend.flush(1);

    chai.expect(callback.callCount).to.equal(0);
    $httpBackend.verifyNoOutstandingExpectation();
  });

  describe('isAdmin function', function() {

    it('returns false if not logged in', function(done) {
      ipCookie.returns({});
      var actual = service.isAdmin();
      chai.expect(actual).to.equal(false);
      done();
    });

    it('returns true for _admin', function(done) {
      ipCookie.returns({ roles: [ '_admin' ] });
      var actual = service.isAdmin();
      chai.expect(actual).to.equal(true);
      done();
    });

    it('returns true for national_admin', function(done) {
      ipCookie.returns({ roles: [ 'national_admin', 'some_other_role' ] });
      var actual = service.isAdmin();
      chai.expect(actual).to.equal(true);
      done();
    });

    it('returns false for everyone else', function(done) {
      ipCookie.returns({ roles: [ 'district_admin', 'some_other_role' ] });
      var actual = service.isAdmin();
      chai.expect(actual).to.equal(false);
      done();
    });

  });

  describe('isDbAdmin', () => {
    it('should return false if not logged in', () => {
      ipCookie.returns({});
      chai.expect(service.isDbAdmin()).to.equal(false);
    });

    it('returns true for _admin', () => {
      ipCookie.returns({ roles: [ '_admin' ] });
      chai.expect(service.isDbAdmin()).to.equal(true);
      chai.expect(service.isDbAdmin({ roles: ['_admin', 'aaaa'] })).to.equal(true);
    });

    it('returns false for everyone else', () => {
      ipCookie.returns({ roles: [ 'district_admin', 'some_other_role' ] });
      chai.expect(service.isDbAdmin()).to.equal(false);
      ipCookie.returns({ roles: [ 'national_admin', 'some_other_role' ] });
      chai.expect(service.isDbAdmin()).to.equal(false);
      chai.expect(service.isDbAdmin({ roles: ['role1', 'national_admin'] })).to.equal(false);
    });
  });
});
