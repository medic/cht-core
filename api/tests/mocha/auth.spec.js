const request = require('request-promise-native');
const url = require('url');
const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../src/auth');
const config = require('../../src/config');
const environment = require('../../src/environment');

let originalServerUrl;

describe('Auth', () => {

  beforeEach(() => {
    originalServerUrl = environment.serverUrl;
  });

  afterEach(() => {
    sinon.restore();
    environment.serverUrl = originalServerUrl;
  });

  describe('check', () => {

    it('returns error when not logged in', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').rejects({ statusCode: 401 });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err.message).to.equal('Not logged in');
        chai.expect(err.code).to.equal(401);
      });
    });

    it('returns error with incomplete session', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').resolves();
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err.message).to.equal('Failed to authenticate');
        chai.expect(err.code).to.equal(500);
      });
    });

    it('returns error when no user context', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').resolves({ roles: [] });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Failed to authenticate');
        chai.expect(err.code).to.equal(500);
      });
    });

    it('returns error when request errors', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').rejects({ error: 'boom' });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err).to.deep.equal({ error: 'boom' });
      });
    });

    it('returns error when it has insufficient privilege', () => {
      environment.serverUrl = 'http://abc.com';
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
      environment.serverUrl = 'http://abc.com';
      const userCtx = { userCtx: { name: 'steve', roles: [ '_admin' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      return auth.check({headers: []}, 'can_edit').then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.name).to.equal('steve');
      });
    });

    it('returns username of non-admin user', () => {
      environment.serverUrl = 'http://abc.com';
      const userCtx = { userCtx: { name: 'laura', roles: [ 'xyz', 'district_admin' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({ can_edit: ['district_admin'] });
      return auth.check({headers: []}, 'can_edit').then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.name).to.equal('laura');
      });
    });

    it('accepts multiple required roles', () => {
      environment.serverUrl = 'http://abc.com';
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
      environment.serverUrl = 'http://abc.com';
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

  describe('checkUrl', () => {

    it('requests the given url and returns status', () => {
      environment.serverUrl = 'http://abc.com';
      const format = sinon.stub(url, 'format').returns('http://abc.com');
      const head = sinon.stub(request, 'head').resolves({ statusCode: 444 });
      return auth.checkUrl({ params: { path: '/home/screen' } }).then(actual => {
        chai.expect(format.callCount).to.equal(1);
        chai.expect(format.args[0][0].pathname).to.equal('/home/screen');
        chai.expect(head.callCount).to.equal(1);
        chai.expect(head.args[0][0].url).to.equal('http://abc.com');
        chai.expect(actual).to.equal(444);
      });
    });

  });
});
