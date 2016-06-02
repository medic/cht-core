describe('Session service', function() {

  'use strict';

  var service,
      ipCookie,
      ipCookieRemove,
      location,
      appCache,
      appCacheListener,
      Location,
      kansoLogout,
      kansoInfo,
      kansoSessionListener;

  beforeEach(function () {
    module('inboxApp');
    ipCookie = sinon.stub();
    ipCookieRemove = sinon.stub();
    appCacheListener = sinon.stub();
    ipCookie.remove = ipCookieRemove;
    Location = {};
    kansoLogout = sinon.stub();
    kansoInfo = sinon.stub();
    kansoSessionListener = sinon.stub();
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
          location: location,
          applicationCache: appCache
        };
      });
      $provide.value('KansoPackages', {
        session: {
          logout: kansoLogout,
          info: kansoInfo,
          on: kansoSessionListener
        }
      });
    });
    inject(function($injector) {
      service = $injector.get('Session');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(ipCookie, ipCookieRemove, kansoLogout, kansoInfo, kansoSessionListener, appCacheListener);
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
    kansoLogout.callsArg(0);
    service.logout();
    chai.expect(kansoLogout.callCount).to.equal(1);
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('logs out if no user context', function(done) {
    ipCookie.returns({});
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    kansoLogout.callsArg(0);
    service.init();
    chai.expect(kansoLogout.callCount).to.equal(1);
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('redirects to login if not logged in remotely', function(done) {
    ipCookie.returns({ name: 'bryan' });
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    kansoInfo.callsArgWith(0, { status: 401 });
    service.init();
    chai.expect(kansoLogout.callCount).to.equal(0);
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('does not log out if server not found', function(done) {
    ipCookie.returns({ name: 'bryan' });
    kansoLogout.callsArg(0);
    kansoInfo.callsArgWith(0, { status: 404 });
    service.init();
    chai.expect(kansoLogout.callCount).to.equal(0);
    chai.expect(ipCookieRemove.callCount).to.equal(0);
    done();
  });

  it('logs out if remote userCtx inconsistent', function(done) {
    ipCookie.returns({ name: 'bryan' });
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    kansoLogout.callsArg(0);
    kansoInfo.callsArgWith(0, null, { userCtx: { name: 'jimmy' } });
    service.init();
    chai.expect(kansoLogout.callCount).to.equal(1);
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

  it('does not log out if remote userCtx consistent', function(done) {
    ipCookie.returns({ name: 'bryan' });
    kansoLogout.callsArg(0);
    kansoInfo.callsArgWith(0, null, { userCtx: { name: 'bryan' } });
    service.init();
    chai.expect(kansoLogout.callCount).to.equal(0);
    chai.expect(ipCookieRemove.callCount).to.equal(0);
    chai.expect(kansoSessionListener.callCount).to.equal(1);
    chai.expect(kansoSessionListener.args[0][0]).to.equal('change');
    done();
  });

  it('redirects to login on remote session change', function(done) {
    ipCookie.returns({ name: 'bryan' });
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    kansoLogout.callsArg(0);
    kansoInfo
      .onFirstCall().callsArgWith(0, null, { userCtx: { name: 'bryan' } })
      .onSecondCall().callsArgWith(0, null, { userCtx: { name: 'dave' } });
    service.init();
    kansoSessionListener.args[0][1]({});
    chai.expect(kansoLogout.callCount).to.equal(1);
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    chai.expect(kansoSessionListener.args[0][0]).to.equal('change');
    done();
  });

  it('does not redirect to login on remote session change if offline', function(done) {
    ipCookie.returns({ name: 'bryan' });
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    kansoInfo
      .onFirstCall().callsArgWith(0, null, { userCtx: { name: 'bryan' } })
      .onSecondCall().callsArgWith(0, { status: 404 });
    service.init();
    kansoSessionListener.args[0][1]({});
    chai.expect(kansoLogout.callCount).to.equal(0);
    chai.expect(ipCookieRemove.callCount).to.equal(0);
    done();
  });

  it('waits for app cache download before logging out', function(done) {
    ipCookie.returns({});
    location.href = 'CURRENT_URL';
    Location.dbName = 'DB_NAME';
    kansoLogout.callsArg(0);
    appCache.status = 3;
    service.init();
    appCacheListener.args[0][1](); // fire the appcache callback
    chai.expect(appCacheListener.callCount).to.equal(1);
    chai.expect(appCacheListener.args[0][0]).to.equal('updateready');
    chai.expect(kansoLogout.callCount).to.equal(1);
    chai.expect(location.href).to.equal('/DB_NAME/login?redirect=CURRENT_URL');
    chai.expect(ipCookieRemove.args[0][0]).to.equal('userCtx');
    done();
  });

});