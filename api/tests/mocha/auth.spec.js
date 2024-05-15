const request = require('@medic/couch-request');
const url = require('url');
const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../src/auth');
const config = require('../../src/config');
const environment = require('../../src/environment');

let req;

describe('Auth', () => {

  beforeEach(() => {
    req = {
      headers: {
        host: 'localhost:5988',
        'user-agent': 'curl/8.6.0',
        accept: '*/*',
        'content-type': 'application/json',
      },
    };
    sinon.stub(environment, 'serverUrlNoAuth').get(() => 'http://abc.com');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('check', () => {

    it('returns error when not logged in', () => {
      const get = sinon.stub(request, 'get').rejects({ statusCode: 401 });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err.message).to.equal('Not logged in');
        chai.expect(err.code).to.equal(401);
      });
    });

    it('returns error with incomplete session', () => {
      const get = sinon.stub(request, 'get').resolves();
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err.message).to.equal('Failed to authenticate');
        chai.expect(err.code).to.equal(500);
      });
    });

    it('returns error when no user context', () => {
      const get = sinon.stub(request, 'get').resolves({ roles: [] });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Failed to authenticate');
        chai.expect(err.code).to.equal(500);
      });
    });

    it('returns error when request errors', () => {
      const get = sinon.stub(request, 'get').rejects({ error: 'boom' });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err).to.deep.equal({ error: 'boom' });
      });
    });

    it('returns error when it has insufficient privilege', () => {
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({ can_edit: ['abc'] });
      return auth.check({headers: []}, 'can_edit').catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Insufficient privileges');
        chai.expect(err.code).to.equal(403);
      });
    });

    it('returns username for admin', () => {
      const userCtx = { userCtx: { name: 'steve', roles: [ '_admin' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      return auth.check({headers: []}, 'can_edit').then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.name).to.equal('steve');
      });
    });

    it('returns username of non-admin user', () => {
      const userCtx = { userCtx: { name: 'laura', roles: [ 'xyz', 'district_admin' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({ can_edit: ['district_admin'] });
      return auth.check({headers: []}, 'can_edit').then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.name).to.equal('laura');
      });
    });

    it('accepts multiple required roles', () => {
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
      sinon.stub(url, 'format').returns('http://abc.com');
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({
        can_export_messages: ['district_admin'],
        can_export_contacts: ['district_admin'],
      });
      return auth.check({headers: []}, [ 'can_export_messages', 'can_export_contacts' ]).then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.name).to.equal('steve');
      });
    });

    it('checks all required roles', () => {
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
      sinon.stub(url, 'format').returns('http://abc.com');
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({
        can_export_messages: ['district_admin'],
        can_export_server_logs: ['national_admin'],
      });
      return auth.check({headers: []}, [ 'can_export_messages', 'can_export_server_logs' ]).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Insufficient privileges');
        chai.expect(err.code).to.equal(403);
      });
    });
  });

  describe('getUserCtx', () => {
    it('should return userCtx when authentication is successful', async () => {
      sinon.stub(request, 'get').resolves({ userCtx: { name: 'user', roles: ['userrole'] }});

      const result = await auth.getUserCtx(req);
      chai.expect(result).to.deep.equal({ name: 'user', roles: ['userrole'] });
      chai.expect(request.get.args).to.deep.equal([[{
        url: 'http://abc.com/_session',
        json: true,
        headers: {
          host: 'localhost:5988',
          'user-agent': 'curl/8.6.0',
          accept: '*/*',
          'content-type': 'application/json',
        },
      }]]);
    });

    it('should clean content-length headers before forwarding', async () => {
      sinon.stub(request, 'get').resolves({ userCtx: { name: 'theuser', roles: ['userrole'] }});

      req.headers['content-length'] = 100;
      req.headers['Content-Length'] = 22;
      req.headers['Content-length'] = 44;
      req.headers['content-Length'] = 82;
      req.headers['CONTENT-LENGTH'] = 240;

      const result = await auth.getUserCtx(req);
      chai.expect(result).to.deep.equal({ name: 'theuser', roles: ['userrole'] });
      chai.expect(request.get.args).to.deep.equal([[{
        url: 'http://abc.com/_session',
        json: true,
        headers: {
          host: 'localhost:5988',
          'user-agent': 'curl/8.6.0',
          accept: '*/*',
          'content-type': 'application/json',
        },
      }]]);
    });

    it('should throw a custom 401 error', async () => {
      sinon.stub(request, 'get').rejects({ statusCode: 401, error: 'not logged in' });

      await chai.expect(auth.getUserCtx(req)).to.be.rejected.and.eventually.deep.equal({
        code: 401,
        message: 'Not logged in',
        err: { statusCode: 401, error: 'not logged in' }
      });

      chai.expect(request.get.callCount).to.equal(1);
    });

    it('should throw non-401 errors', async () => {
      sinon.stub(request, 'get').rejects({ statusCode: 400, error: 'invalid' });

      await chai.expect(auth.getUserCtx(req)).to.be.rejected.and.eventually.deep.equal({
        statusCode: 400,
        error: 'invalid'
      });

      chai.expect(request.get.callCount).to.equal(1);
    });

    it('should throw 500 when auth is invalid', async () => {
      sinon.stub(request, 'get').resolves({ userCtx: { invalid: 'userctx' }});

      await chai.expect(auth.getUserCtx(req)).to.be.rejected.and.eventually.deep.equal({
        code: 500,
        message: 'Failed to authenticate'
      });

      chai.expect(request.get.callCount).to.equal(1);
    });
  });

});
