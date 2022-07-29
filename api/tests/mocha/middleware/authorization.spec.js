const sinon = require('sinon');
require('chai').should();
const middleware = require('../../../src/middleware/authorization');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');

let proxy;
let next;
let testReq;
let testRes;

describe('Authorization middleware', () => {
  beforeEach(() => {
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'isOnlineOnly');
    sinon.stub(auth, 'getUserSettings');
    sinon.stub(serverUtils, 'error');
    proxy = { web: sinon.stub().resolves() };
    next = sinon.stub().resolves();
    testReq = {
      headers: {}
    };
    testRes = {
      status: sinon.stub(),
      json: sinon.stub()
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getUserCtx', () => {
    it('handles unauthenticated requests', () => {
      auth.getUserCtx.rejects({ some: 'error' });
      return middleware
        .getUserCtx(testReq, testRes, next)
        .then(() => {
          next.callCount.should.equal(1);
          (!!testReq.userCtx).should.equal(false);
          testReq.authErr.should.deep.equal({ some: 'error' });
          serverUtils.error.callCount.should.equal(0);
        });
    });

    it('saves CouchDB session as `userCtx` in the `req` object', () => {
      auth.getUserCtx.resolves({ name: 'user' });
      return middleware
        .getUserCtx(testReq, testRes, next)
        .then(() => {
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(1);
          testReq.userCtx.should.deep.equal({ name: 'user' });
          (!!testReq.authErr).should.equal(false);
          (!!testReq.replicationId).should.equal(false);
        });
    });

    it('should save medic-replication-id header in the `req` object', () => {
      auth.getUserCtx.resolves({ name: 'user' });
      testReq.headers['medic-replication-id'] = 'some random uuid';
      return middleware
        .getUserCtx(testReq, testRes, next)
        .then(() => {
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(1);
          testReq.userCtx.should.deep.equal({ name: 'user' });
          testReq.replicationId.should.equal('some random uuid');
          (!!testReq.authErr).should.equal(false);
        });
    });
  });

  describe('handleAuthErrors', () => {
    it('should not allow authorized with no userCtx', () => {
      testReq.authorized = true;
      middleware.handleAuthErrors(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
    });

    it('should allow authorized when request has no error and has userctx', () => {
      testReq.authorized = true;
      testReq.userCtx = { };
      middleware.handleAuthErrors(testReq, testRes, next);
      next.callCount.should.equal(1);
      serverUtils.error.callCount.should.equal(0);
    });

    it('should allow non-authorized when request has no auth error', () => {
      testReq.authorized = false;
      testReq.userCtx = {};
      middleware.handleAuthErrors(testReq, testRes, next);
      next.callCount.should.equal(1);
      serverUtils.error.callCount.should.equal(0);
    });

    it('should write the auth error', () => {
      testReq.authErr = { some: 'error' };
      middleware.handleAuthErrors(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
      serverUtils.error.args[0].should.deep.equal([{ some: 'error' }, testReq, testRes]);
    });

    it('should error when no authErr and no userCtx', () => {
      middleware.handleAuthErrors(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
      serverUtils.error.args[0].should.deep.equal(['Authentication error', testReq, testRes]);
    });
  });

  describe('handleAuthErrorsAllowingAuthorized', () => {
    it('should allow authorized', () => {
      testReq.authorized = true;
      middleware.handleAuthErrorsAllowingAuthorized(testReq, testRes, next);
      next.callCount.should.equal(1);
      serverUtils.error.callCount.should.equal(0);
    });

    it('should allow non-authorized when the request has no error', () => {
      testReq.authorized = false;
      testReq.userCtx = { };
      middleware.handleAuthErrorsAllowingAuthorized(testReq, testRes, next);
      next.callCount.should.equal(1);
      serverUtils.error.callCount.should.equal(0);
    });

    it('should write the auth error when not authorized', () => {
      testReq.authErr = { some: 'error' };
      middleware.handleAuthErrorsAllowingAuthorized(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
      serverUtils.error.args[0].should.deep.equal([{ some: 'error' }, testReq, testRes]);
    });

    it('should allow authorized when param is passed even with auth error', () => {
      testReq.authorized = true;
      testReq.authErr = { some: 'error' };
      middleware.handleAuthErrorsAllowingAuthorized(testReq, testRes, next);
      next.callCount.should.equal(1);
      serverUtils.error.callCount.should.equal(0);
    });

    it('should error when no authErr and no userCtx', () => {
      middleware.handleAuthErrorsAllowingAuthorized(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.error.callCount.should.equal(1);
      serverUtils.error.args[0].should.deep.equal(['Authentication error', testReq, testRes]);
    });
  });

  describe('Online Users Proxy', () => {
    it('it proxies the request for online users', () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);

      return middleware
        .onlineUserProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(0);
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          proxy.web.callCount.should.equal(1);
          proxy.web.args[0].should.deep.equal([ testReq, testRes ]);
        });
    });

    it('does not proxy requests for offline users', () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.resolves({ name: 'user', contact_id: 'a' });

      return middleware
        .onlineUserProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.error.callCount.should.equal(0);
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
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal([undefined]);
          proxy.web.callCount.should.equal(0);
          testReq.userCtx.should.deep.equal({ name: 'user', contact_id: 'a' });
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });

    it('catches user_settings errors', () => {
      testReq.userCtx = { name: 'user' };
      auth.getUserCtx.resolves({ name: 'user' });
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.withArgs({ name: 'user' }).rejects({ some: 'error' });

      return middleware
        .onlineUserProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal([{ some: 'error' }]);
          proxy.web.callCount.should.equal(0);
          testReq.userCtx.should.deep.equal({ name: 'user' });
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
          serverUtils.error.callCount.should.equal(0);
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
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal([undefined]);
          testReq.userCtx.should.deep.equal({ name: 'user', contact_id: 'a' });
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });

    it('catches user_settings errors', () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.withArgs({ name: 'user' }).rejects({ some: 'error' });

      return middleware
        .onlineUserPassThrough(testReq, testRes, next)
        .then(() => {
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal([{ some: 'error' }]);
          testReq.userCtx.should.deep.equal({ name: 'user' });
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });
  });

  describe('offlineUserFirewall', () => {
    it('should block offline users', () => {
      testReq.userCtx = { name: 'user' };
      testReq.authorized = false;
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      middleware.offlineUserFirewall(testReq, testRes, next);
      serverUtils.error.callCount.should.equal(0);
      next.callCount.should.equal(0);
      testRes.status.callCount.should.equal(1);
      testRes.status.args[0].should.deep.equal([403]);
      testRes.json.callCount.should.equal(1);
      testRes.json.args[0].should.deep.equal([{
        code: 403,
        error: 'forbidden',
        details: 'Offline users are not allowed access to this endpoint'
      }]);
    });

    it('should allow offline users when request is authorized', () => {
      testReq.userCtx = { name: 'user' };
      testReq.authorized = true;
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      middleware.offlineUserFirewall(testReq, testRes, next);
      serverUtils.error.callCount.should.equal(0);
      next.callCount.should.equal(1);
      testRes.status.callCount.should.equal(0);
      testRes.json.callCount.should.equal(0);
    });

    it('should allow online users', () => {
      testReq.userCtx = { name: 'user' };
      testReq.authorized = false;
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);
      middleware.offlineUserFirewall(testReq, testRes, next);
      serverUtils.error.callCount.should.equal(0);
      next.callCount.should.equal(1);
      testRes.status.callCount.should.equal(0);
      testRes.json.callCount.should.equal(0);
    });
  });

  describe('setAuthorized', () => {
    it('sets correct authorized flag and forwards to next route', () => {
      middleware.setAuthorized(testReq, testRes, next);
      testReq.authorized.should.equal(true);
      next.callCount.should.equal(1);
    });
  });

  describe('GetUserSettings', () => {
    it('it nexts request for online users', () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);

      return middleware
        .getUserSettings(testReq, testRes, next)
        .then(() => {
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(1);
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
        });
    });

    it('hydrates offline user_settings doc, saves it in `req` and forwards to next middleware', () => {
      testReq.userCtx = { name: 'user' };
      auth.getUserCtx.resolves({ name: 'user' });
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.withArgs({ name: 'user' }).resolves({ name: 'user', contact_id: 'a' });

      return middleware
        .getUserSettings(testReq, testRes, next)
        .then(() => {
          serverUtils.error.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal([undefined]);
          testReq.userCtx.should.deep.equal({ name: 'user', contact_id: 'a' });
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });
  });
});
