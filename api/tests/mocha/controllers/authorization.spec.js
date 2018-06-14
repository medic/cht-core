const sinon = require('sinon').sandbox.create();
require('chai').should();
const controller = require('../../../src/controllers/authorization');
const auth = require('../../../src/auth');
const serverUtils = require('../../../src/server-utils');

const testReq = {};
const testRes = {};

let proxy,
    next;

describe('Authorization controller', () => {
  beforeEach(() => {
    sinon.stub(auth, 'getUserCtx');
    sinon.stub(auth, 'isOnlineOnly');
    sinon.stub(auth, 'getUserSettings');
    sinon.stub(serverUtils, 'notLoggedIn');
    proxy = { web: sinon.stub() };
    next = sinon.stub().resolves();

  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Admin Proxy', () => {
    it('handles not logged in requests', () => {
      auth.getUserCtx.rejects();
      return controller
        .adminProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(1);
          next.callCount.should.equal(0);
        });
    });

    it('it proxies the request for admins', () => {
      auth.getUserCtx.resolves({ name: 'user' });
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);

      return controller
        .adminProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(0);
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          proxy.web.callCount.should.equal(1);
          proxy.web.args[0].should.deep.equal([ testReq, testRes ]);
        });
    });

    it('does not proxy requests for non admins' , () => {
      auth.getUserCtx.resolves({ name: 'user' });
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.resolves({ name: 'user', contact_id: 'a' });

      return controller
        .adminProxy(proxy, testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          proxy.web.callCount.should.equal(0);
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
          auth.getUserSettings.args[0][0].should.deep.equal({ name: 'user'});
        });
    });

    it('hydrates restricted user doc, saves it in `req` and passes to next middleware', () => {
      auth.getUserCtx.resolves({ name: 'user' });
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.withArgs({ name: 'user' }).resolves({ name: 'user', contact_id: 'a' });

      return controller
        .adminProxy(proxy, testReq, testRes, next)
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

  describe('Admin Pass Through', () => {
    it('handles not logged in requests', () => {
      auth.getUserCtx.rejects();
      return controller
        .adminPassThrough(testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(1);
          next.callCount.should.equal(0);
        });
    });

    it('it sends admin requests to next route', () => {
      auth.getUserCtx.resolves({ name: 'user' });
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(true);

      return controller
        .adminPassThrough(testReq, testRes, next)
        .then(() => {
          serverUtils.notLoggedIn.callCount.should.equal(0);
          next.callCount.should.equal(1);
          next.args[0][0].should.equal('route');
          auth.isOnlineOnly.args[0][0].should.deep.equal({ name: 'user'});
        });
    });

    it('hydrates restricted user doc, saves it in `req` and passes to next middleware', () => {
      auth.getUserCtx.resolves({ name: 'user' });
      auth.isOnlineOnly.withArgs({ name: 'user' }).returns(false);
      auth.getUserSettings.withArgs({ name: 'user' }).resolves({ name: 'user', contact_id: 'a' });

      return controller
        .adminPassThrough(testReq, testRes, next)
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
