const request = require('@medic/couch-request');
const url = require('url');
const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../src/auth');
const config = require('../../src/config');
const environment = require('@medic/environment');
const { PermissionError } = require('../../src/errors');

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
      const get = sinon.stub(request, 'get').rejects({ status: 401 });
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
        },
      }]]);
    });

    it('should clean content-length and content-type headers before forwarding', async () => {
      sinon.stub(request, 'get').resolves({ userCtx: { name: 'theuser', roles: ['userrole'] }});

      req.headers['content-length'] = 100;
      req.headers['Content-Length'] = 22;
      req.headers['Content-length'] = 44;
      req.headers['content-Length'] = 82;
      req.headers['CONTENT-LENGTH'] = 240;

      req.headers['content-type'] = 'application/json';
      req.headers['Content-Type'] = 'image/jpeg';
      req.headers['Content-type'] = 'x-www-form-urlencoded';
      req.headers['content-Type'] = 'multipart/form-data';
      req.headers['CONTENT-TYPE'] = 'text/html';


      const result = await auth.getUserCtx(req);
      chai.expect(result).to.deep.equal({ name: 'theuser', roles: ['userrole'] });
      chai.expect(request.get.args).to.deep.equal([[{
        url: 'http://abc.com/_session',
        json: true,
        headers: {
          host: 'localhost:5988',
          'user-agent': 'curl/8.6.0',
          accept: '*/*',
        },
      }]]);
    });

    it('should throw a custom 401 error', async () => {
      sinon.stub(request, 'get').rejects({ status: 401, error: 'not logged in' });

      await chai.expect(auth.getUserCtx(req)).to.be.rejected.and.eventually.deep.equal({
        code: 401,
        message: 'Not logged in',
        err: { status: 401, error: 'not logged in' }
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

  describe('assertPermissions', () => {
    const requestOptions = {
      url: 'http://abc.com/_session',
      json: true,
      headers: {
        host: 'localhost:5988',
        'user-agent': 'curl/8.6.0',
        accept: '*/*',
      },
    };

    let userCtx;

    beforeEach(() => {
      userCtx = { name: 'user', roles: ['district_admin'] };
      sinon.stub(request, 'get').resolves({ userCtx });
      sinon.stub(config, 'get');
    });

    it('succeeds when no permissions are required', async () => {
      const result = await auth.assertPermissions(req, {});

      chai.expect(result).to.deep.equal(userCtx);
      chai.expect(request.get.calledOnceWithExactly(requestOptions)).to.be.true;
      chai.expect(config.get.notCalled).to.be.true;
    });

    it('succeeds when user has all required permissions', async () => {
      config.get.returns({
        can_edit: ['district_admin'],
        can_view: ['district_admin'],
      });

      const result = await auth.assertPermissions(req, { hasAll: ['can_edit', 'can_view'] });

      chai.expect(result).to.deep.equal(userCtx);
      chai.expect(request.get.calledOnceWithExactly(requestOptions)).to.be.true;
      chai.expect(config.get.args).to.deep.equal([['permissions'], ['permissions']]);
    });

    it('succeeds when user has any of the required permissions', async () => {
      config.get.returns({
        can_edit: ['national_admin'],
        can_delete: ['district_admin'],
      });

      const result = await auth.assertPermissions(req, { hasAny: ['can_edit', 'can_delete'] });

      chai.expect(result).to.deep.equal(userCtx);
      chai.expect(request.get.calledOnceWithExactly(requestOptions)).to.be.true;
      chai.expect(config.get.args).to.deep.equal([['permissions'], ['permissions']]);
    });

    it('succeeds when user is online and isOnline is required', async () => {
      userCtx.roles.push('mm-online');

      const result = await auth.assertPermissions(req, { isOnline: true });

      chai.expect(result).to.deep.equal(userCtx);
      chai.expect(request.get.calledOnceWithExactly(requestOptions)).to.be.true;
      chai.expect(config.get.notCalled).to.be.true;
    });

    it('succeeds for admin user regardless of permissions', async () => {
      userCtx.roles.push('_admin');
      config.get.returns({
        can_edit: ['other_role'],
      });

      const result = await auth.assertPermissions(req, { hasAll: ['can_edit'] });

      chai.expect(result).to.deep.equal(userCtx);
      chai.expect(request.get.calledOnceWithExactly(requestOptions)).to.be.true;
      chai.expect(config.get.notCalled).to.be.true;
    });

    it('throws PermissionError when user lacks all required permissions', async () => {
      config.get.returns({
        can_edit: ['district_admin'],
        can_delete: ['national_admin'],
      });

      await chai.expect(auth.assertPermissions(req, { hasAll: ['can_edit', 'can_delete'] }))
        .to.be.rejectedWith(PermissionError, 'Insufficient privileges');

      chai.expect(request.get.calledOnceWithExactly(requestOptions)).to.be.true;
      chai.expect(config.get.args).to.deep.equal([['permissions'], ['permissions']]);
    });

    it('throws PermissionError when user lacks any of the required permissions', async () => {
      config.get.returns({
        can_delete: ['national_admin'],
        can_purge: ['national_admin'],
      });

      await chai.expect(auth.assertPermissions(req, { hasAny: ['can_delete', 'can_purge'] }))
        .to.be.rejectedWith(PermissionError, 'Insufficient privileges');

      chai.expect(request.get.calledOnceWithExactly(requestOptions)).to.be.true;
      chai.expect(config.get.args).to.deep.equal([['permissions'], ['permissions']]);
    });

    it('throws PermissionError when isOnline is required but user is offline', async () => {
      await chai.expect(auth.assertPermissions(req, { isOnline: true }))
        .to.be.rejectedWith(PermissionError, 'Insufficient privileges');

      chai.expect(request.get.calledOnceWithExactly(requestOptions)).to.be.true;
      chai.expect(config.get.notCalled).to.be.true;
    });
  });
});
