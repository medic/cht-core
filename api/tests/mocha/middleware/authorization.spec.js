const sinon = require('sinon').sandbox.create();
require('chai').should();
const middleware = require('../../../src/middleware/authorization');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');

let proxy,
    next,
    testReq,
    testRes;

describe('Authorization middleware', () => {
  beforeEach(() => {
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'isOnlineOnly');
    sinon.stub(auth, 'getUserSettings');
    sinon.stub(serverUtils, 'notLoggedIn');
    proxy = { web: sinon.stub().resolves() };
    next = sinon.stub().resolves();
    testReq = {};
    testRes = {};
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('authenticated', () => {
    it('blocks unauthenticated requests', () => {
      middleware.authenticated(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.notLoggedIn.callCount.should.equal(1);
    });

    it('forwards authenticated requests', () => {
      testReq.userCtx = {};
      middleware.authenticated(testReq, testRes, next);
      next.callCount.should.equal(1);
      serverUtils.notLoggedIn.callCount.should.equal(0);
    });
  });

  describe('getUserCtx', () => {
    it('handles not logged in requests', () => {
      auth.getUserCtx.rejects();
      return middleware
        .getUserCtx(testReq, testRes, next)
        .then(() => {
          next.callCount.should.equal(1);
          (!!testReq.userCtx).should.equal(false);
        });
    });

    it('saves CouchDB session as `userCtx` in the `req` object', () => {
      auth.getUserCtx.resolves({ name: 'user' });
      return middleware
        .getUserCtx(testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          testReq.userCtx.should.deep.equal({ name: 'user' });
        });
    });
  });

  describe('Online Users Proxy', () => {
    it('it proxies the request for online users', () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);

      return middleware
        .onlineUserProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(0);
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          proxy.web.callCount.should.equal(1);
          proxy.web.args[0].should.deep.equal([ testReq, testRes ]);
        });
    });

    it('does not proxy requests for offline users' , () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.resolves({ name: 'user', contact_id: 'a' });

      return middleware
        .onlineUserProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          proxy.web.callCount.should.equal(0);
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });

    it('hydrates offline user_settings doc, saves it in `req` and forwards to next middleware', () => {
      testReq.userCtx = { name: 'user' };
      auth.getUserCtx.resolves({ name: 'user' });
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.withArgs({ name: 'user' }).resolves({ name: 'user', contact_id: 'a' });

      return middleware
        .onlineUserProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          proxy.web.callCount.should.equal(0);
          testReq.userCtx.should.deep.equal({ name: 'user', contact_id: 'a' });
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });
  });

  describe('Online User Pass Through', () => {
    it('it sends online user requests to next route', () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);

      return middleware
        .onlineUserPassThrough(testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0][0].should.equal('route');
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
        });
    });

    it('hydrates offline user_settings doc, saves it in `req` and forwards to next middleware', () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.withArgs({ name: 'user' }).resolves({ name: 'user', contact_id: 'a' });

      return middleware
        .onlineUserPassThrough(testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal([]);
          testReq.userCtx.should.deep.equal({ name: 'user', contact_id: 'a' });
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });
  });
});
