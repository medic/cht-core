const sinon = require('sinon');
const chai = require('chai');
const environment = require('../../src/environment');
const serverUtils = require('../../src/server-utils');
const cookie = require('../../src/services/cookie');

const req = {
  url: '',
  get: () => {}
};
const res = {
  writeHead: () => {},
  end: () => {},
  json: () => {},
  redirect: () => {},
  status: () => {},
  setHeader: () => {},
};

let originalDb;

describe('Server utils', () => {

  beforeEach(() => {
    originalDb = environment.db;
    environment.db = 'medic';
  });

  afterEach(() => {
    environment.db = originalDb;
    sinon.restore();
  });

  describe('error', () => {

    it('calls serverError when given string', () => {
      const serverError = sinon.stub(serverUtils, 'serverError');
      serverUtils.error('some string', req, res);
      chai.expect(serverError.callCount).to.equal(1);
      chai.expect(serverError.args[0][0]).to.equal('some string');
    });

    it('calls serverError when given 500 error', () => {
      const serverError = sinon.stub(serverUtils, 'serverError');
      serverUtils.error({ code: 500, message: 'some string' }, req, res);
      chai.expect(serverError.callCount).to.equal(1);
      chai.expect(serverError.args[0][0].message).to.equal('some string');
    });

    it('calls notLoggedIn when given 401 error', () => {
      sinon.stub(serverUtils, 'notLoggedIn');
      sinon.spy(serverUtils, 'serverError');
      sinon.stub(res, 'end');
      serverUtils.error({ code: 401 }, req, res);
      chai.expect(serverUtils.notLoggedIn.callCount).to.equal(1);
      chai.expect(serverUtils.notLoggedIn.args[0]).to.deep.equal([req, res, undefined]);
      chai.expect(serverUtils.serverError.callCount).to.equal(0);
      chai.expect(res.end.callCount).to.equal(0);
    });

    it('function handles 503 errors - #3821', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      const end = sinon.stub(res, 'end');
      // an example error thrown by the `request` library
      const error = {
        code: 503,
        message: {
          message: 'connect ECONNREFUSED 127.0.0.1:5985',
          stack:
            'Error: connect ECONNREFUSED 127.0.0.1:5985\n    at Object.exports._errnoException ' +
            '(util.js:1016:11)\n    at exports._exceptionWithHostPort (util.js:1039:20)\n    ' +
            'at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1138:14)',
          code: 'ECONNREFUSED',
          errno: 'ECONNREFUSED',
          syscall: 'connect',
          address: '127.0.0.1',
          port: 5985
        }
      };
      serverUtils.error(error, req, res);
      chai.expect(writeHead.callCount).to.equal(1);
      chai.expect(writeHead.args[0][0]).to.equal(500);
      chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal('Server error');
    });

    it('handles unknown errors', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      const end = sinon.stub(res, 'end');
      serverUtils.error({ foo: 'bar' }, req, res);
      chai.expect(writeHead.callCount).to.equal(1);
      chai.expect(writeHead.args[0][0]).to.equal(500);
      chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal('Server error');
    });

    it('500 for any non-numeric error code', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      serverUtils.error({ code: '100' }, req, res);
      chai.expect(writeHead.callCount).to.eq(1);
      chai.expect(writeHead.args[0][0]).to.eq(500);
    });

    it('500 for unparseable non-numeric error code', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      serverUtils.error({ code: 'foo' }, req, res);
      chai.expect(writeHead.callCount).to.eq(1);
      chai.expect(writeHead.args[0][0]).to.eq(500);
    });

    it('handles err.message being an object - #5809', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      const end = sinon.stub(res, 'end');
      const message = { bar: 'foo' };
      serverUtils.error({ code: 400, message: message }, req, res);
      chai.expect(writeHead.callCount).to.eq(1);
      chai.expect(writeHead.args[0][0]).to.eq(400);
      chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal(JSON.stringify(message));
    });

    it('handles err.message being an object with a "message" property - #5809', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      const end = sinon.stub(res, 'end');
      serverUtils.error({ code: 400, message: { message: 'foo' } }, req, res);
      chai.expect(writeHead.callCount).to.eq(1);
      chai.expect(writeHead.args[0][0]).to.eq(400);
      chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal('foo');
    });

  });

  describe('notLoggedIn', () => {

    it('redirects to login page for human user', () => {
      const redirect = sinon.stub(res, 'redirect');
      const setForceLoginStub = sinon.stub(cookie, 'setForceLogin');
      sinon.stub(res, 'setHeader');
      req.url = 'someurl';
      req.headers = { 'user-agent': 'Mozilla/1.0' };

      serverUtils.notLoggedIn(req, res);

      chai.expect(redirect.callCount).to.equal(1);
      chai.expect(redirect.args[0][0]).to.equal(302);
      chai.expect(redirect.args[0][1]).to.equal('/medic/login?redirect=someurl');
      chai.expect(res.setHeader.callCount).to.equal(1);
      chai.expect(res.setHeader.args[0]).to.deep.equal(['logout-authorization', 'CHT-Core API']);
      chai.expect(setForceLoginStub.calledOnce);
      chai.expect(setForceLoginStub.args[0]).to.deep.equal([res]);
    });

    it('returns 401 for medic-collect', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      sinon.stub(res, 'setHeader');
      req.url = 'someurl';
      req.headers = { 'user-agent': null };
      serverUtils.notLoggedIn(req, res);
      chai.expect(writeHead.callCount).to.equal(1);
      chai.expect(writeHead.args[0][0]).to.equal(401);

      chai.expect(res.setHeader.callCount).to.equal(1);
      chai.expect(res.setHeader.args[0]).to.deep.equal(['logout-authorization', 'CHT-Core API']);
    });

    it('shows prompt if requested', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      sinon.stub(res, 'setHeader');
      const end = sinon.stub(res, 'end');
      serverUtils.notLoggedIn(req, res, true);
      chai.expect(writeHead.callCount).to.equal(1);
      chai.expect(writeHead.args[0][0]).to.equal(401);
      chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(writeHead.args[0][1]['WWW-Authenticate']).to.equal('Basic realm="Medic Web Services"');
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal('not logged in');

      chai.expect(res.setHeader.callCount).to.equal(1);
      chai.expect(res.setHeader.args[0]).to.deep.equal(['logout-authorization', 'CHT-Core API']);
    });

    it('responds with JSON if requested', () => {
      const status = sinon.stub(res, 'status');
      const end = sinon.stub(res, 'end');
      const get = sinon.stub(req, 'get');
      get.returns('application/json');
      sinon.stub(res, 'setHeader');
      serverUtils.notLoggedIn(req, res);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('Accept');
      chai.expect(status.callCount).to.equal(1);
      chai.expect(status.args[0][0]).to.equal(401);
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal(JSON.stringify({ code: 401, error: 'unauthorized' }));

      chai.expect(res.setHeader.callCount).to.equal(2);
      chai.expect(res.setHeader.args[0]).to.deep.equal(['logout-authorization', 'CHT-Core API']);
      chai.expect(res.setHeader.args[1]).to.deep.equal(['Content-Type', 'application/json']);
    });

  });

  describe('serverError', () => {

    it('does not leak errors information to the client', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      const end = sinon.stub(res, 'end');
      serverUtils.serverError('boom', req, res);
      chai.expect(writeHead.callCount, 1);
      chai.expect(writeHead.args[0][0]).to.equal(500);
      chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal('Server error');
    });

    it('shares public information with the client', () => {
      const writeHead = sinon.stub(res, 'writeHead');
      const end = sinon.stub(res, 'end');
      serverUtils.serverError({ publicMessage: 'explanation' }, req, res);
      chai.expect(writeHead.callCount).to.equal(1);
      chai.expect(writeHead.args[0][0]).to.equal(500);
      chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal('Server error: "explanation"');
    });

    it('responds with JSON', () => {
      const status = sinon.stub(res, 'status');
      const end = sinon.stub(res, 'end');
      const get = sinon.stub(req, 'get');
      get.returns('application/json');
      serverUtils.serverError({ foo: 'bar' }, req, res);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('Accept');
      chai.expect(status.callCount).to.equal(1);
      chai.expect(status.args[0][0]).to.equal(500);
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal(JSON.stringify({ code: 500, error: 'Server error' }));
    });

    it('handles uncaught payload size exceptions', () => {
      const status = sinon.stub(res, 'status');
      const end = sinon.stub(res, 'end');
      const get = sinon.stub(req, 'get');
      get.returns('application/json');
      serverUtils.serverError({ foo: 'bar', type: 'entity.too.large' }, req, res);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0]).to.equal('Accept');
      chai.expect(status.callCount).to.equal(1);
      chai.expect(status.args[0][0]).to.equal(413);
      chai.expect(end.callCount).to.equal(1);
      chai.expect(end.args[0][0]).to.equal(JSON.stringify({ code: 413, error: 'Payload Too Large' }));
    });

  });

});
