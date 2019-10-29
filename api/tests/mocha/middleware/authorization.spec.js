const sinon = require('sinon').sandbox.create();
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
    sinon.stub(serverUtils, 'notLoggedIn');
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
          serverUtils.notLoggedIn.callCount.should.equal(0);
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
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          testReq.userCtx.should.deep.equal({ name: 'user' });
          testReq.replicationId.should.equal('some random uuid');
          (!!testReq.authErr).should.equal(false);
        });
    });
  });

  describe('Online Users Proxy', () => {
    it('blocks unauthenticated requests', () => {
      middleware.onlineUserProxy(proxy, testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.notLoggedIn.callCount.should.equal(1);
    });

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
          serverUtils.notLoggedIn.callCount.should.equal(0);
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
    it('blocks unauthenticated requests', () => {
      middleware.onlineUserPassThrough(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.notLoggedIn.callCount.should.equal(1);
    });

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
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal([{ some: 'error' }]);
          testReq.userCtx.should.deep.equal({ name: 'user' });
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });
  });

  describe('offlineUserFirewall', () => {
    it('blocks unauthenticated requests', () => {
      middleware.offlineUserFirewall(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.notLoggedIn.callCount.should.equal(1);
    });

    it('should block offline users', () => {
      testReq.userCtx = { name: 'user' };
      testReq.authorized = false;
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      middleware.offlineUserFirewall(testReq, testRes, next);
      serverUtils.notLoggedIn.callCount.should.equal(0);
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
      serverUtils.notLoggedIn.callCount.should.equal(0);
      next.callCount.should.equal(1);
      testRes.status.callCount.should.equal(0);
      testRes.json.callCount.should.equal(0);
    });

    it('should allow online users', () => {
      testReq.userCtx = { name: 'user' };
      testReq.authorized = false;
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);
      middleware.offlineUserFirewall(testReq, testRes, next);
      serverUtils.notLoggedIn.callCount.should.equal(0);
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
    it('blocks unauthenticated requests', () => {
      middleware.getUserSettings(testReq, testRes, next);
      next.callCount.should.equal(0);
      serverUtils.notLoggedIn.callCount.should.equal(1);
    });

    it('it nexts request for online users', () => {
      testReq.userCtx = { name: 'user' };
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);

      return middleware
        .getUserSettings(testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
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
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0].should.deep.equal([undefined]);
          testReq.userCtx.should.deep.equal({ name: 'user', contact_id: 'a' });
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });
  });
});
