const sinon = require('sinon');
const chai = require('chai');
const environment = require('../../src/environment');
const serverUtils = require('../../src/server-utils');
const cookie = require('../../src/services/cookie');

let req;
let res;
let originalDb;

describe('Server utils', () => {

  beforeEach(() => {
    req = {
      url: '',
      get: sinon.stub(),
    };
    res = {
      writeHead: sinon.stub(),
      end: sinon.stub(),
      json: sinon.stub(),
      redirect: sinon.stub(),
      status: sinon.stub(),
      type: sinon.stub(),
      setHeader: sinon.stub(),
    };
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
      serverUtils.error({ code: 401 }, req, res);
      chai.expect(serverUtils.notLoggedIn.callCount).to.equal(1);
      chai.expect(serverUtils.notLoggedIn.args[0]).to.deep.equal([req, res, undefined]);
      chai.expect(serverUtils.serverError.callCount).to.equal(0);
      chai.expect(res.end.callCount).to.equal(0);
    });

    it('function handles 503 errors - #3821', () => {
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
      chai.expect(res.writeHead.callCount).to.equal(1);
      chai.expect(res.writeHead.args[0][0]).to.equal(500);
      chai.expect(res.writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal('Server error');
    });

    it('handles unknown errors', () => {
      serverUtils.error({ foo: 'bar' }, req, res);
      chai.expect(res.writeHead.callCount).to.equal(1);
      chai.expect(res.writeHead.args[0][0]).to.equal(500);
      chai.expect(res.writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal('Server error');
    });

    it('500 for any non-numeric error code', () => {
      serverUtils.error({ code: '100' }, req, res);
      chai.expect(res.writeHead.callCount).to.eq(1);
      chai.expect(res.writeHead.args[0][0]).to.eq(500);
    });

    it('500 for unparseable non-numeric error code', () => {
      serverUtils.error({ code: 'foo' }, req, res);
      chai.expect(res.writeHead.callCount).to.eq(1);
      chai.expect(res.writeHead.args[0][0]).to.eq(500);
    });

    it('handles err.message being an object - #5809', () => {
      const message = { bar: 'foo' };
      serverUtils.error({ code: 400, message: message }, req, res);
      chai.expect(res.writeHead.callCount).to.eq(1);
      chai.expect(res.writeHead.args[0][0]).to.eq(400);
      chai.expect(res.writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal(JSON.stringify(message));
    });

    it('handles err.message being an object with a "message" property - #5809', () => {
      serverUtils.error({ code: 400, message: { message: 'foo' } }, req, res);
      chai.expect(res.writeHead.callCount).to.eq(1);
      chai.expect(res.writeHead.args[0][0]).to.eq(400);
      chai.expect(res.writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal('foo');
    });

  });

  describe('notLoggedIn', () => {

    it('redirects to login page for human user', () => {
      const setForceLoginStub = sinon.stub(cookie, 'setForceLogin');
      req.url = 'someurl';
      req.headers = { 'user-agent': 'Mozilla/1.0' };

      serverUtils.notLoggedIn(req, res);

      chai.expect(res.redirect.callCount).to.equal(1);
      chai.expect(res.redirect.args[0][0]).to.equal(302);
      chai.expect(res.redirect.args[0][1]).to.equal('/medic/login?redirect=someurl');
      chai.expect(res.setHeader.callCount).to.equal(1);
      chai.expect(res.setHeader.args[0]).to.deep.equal(['logout-authorization', 'CHT-Core API']);
      chai.expect(setForceLoginStub.calledOnce);
      chai.expect(setForceLoginStub.args[0]).to.deep.equal([res]);
    });

    it('returns 401 for medic-collect', () => {
      req.url = 'someurl';
      req.headers = { 'user-agent': null };
      serverUtils.notLoggedIn(req, res);
      chai.expect(res.writeHead.callCount).to.equal(1);
      chai.expect(res.writeHead.args[0][0]).to.equal(401);

      chai.expect(res.setHeader.callCount).to.equal(1);
      chai.expect(res.setHeader.args[0]).to.deep.equal(['logout-authorization', 'CHT-Core API']);
    });

    it('shows prompt if requested', () => {
      serverUtils.notLoggedIn(req, res, true);
      chai.expect(res.writeHead.callCount).to.equal(1);
      chai.expect(res.writeHead.args[0][0]).to.equal(401);
      chai.expect(res.writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(res.writeHead.args[0][1]['WWW-Authenticate']).to.equal('Basic realm="Medic Web Services"');
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal('not logged in');

      chai.expect(res.setHeader.callCount).to.equal(1);
      chai.expect(res.setHeader.args[0]).to.deep.equal(['logout-authorization', 'CHT-Core API']);
    });

    it('responds with JSON if requested', () => {
      req.get.returns('application/json');
      serverUtils.notLoggedIn(req, res);
      chai.expect(req.get.callCount).to.equal(1);
      chai.expect(req.get.args[0][0]).to.equal('Accept');
      chai.expect(res.status.callCount).to.equal(1);
      chai.expect(res.status.args[0][0]).to.equal(401);
      chai.expect(res.type.callCount).to.equal(1);
      chai.expect(res.type.args[0]).to.deep.equal(['json']);
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal(JSON.stringify({ code: 401, error: 'unauthorized' }));

      chai.expect(res.setHeader.callCount).to.equal(1);
      chai.expect(res.setHeader.args[0]).to.deep.equal(['logout-authorization', 'CHT-Core API']);
    });

  });

  describe('serverError', () => {

    it('does not leak errors information to the client', () => {
      serverUtils.serverError('boom', req, res);
      chai.expect(res.writeHead.callCount, 1);
      chai.expect(res.writeHead.args[0][0]).to.equal(500);
      chai.expect(res.writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal('Server error');
    });

    it('shares public information with the client', () => {
      serverUtils.serverError({ publicMessage: 'explanation' }, req, res);
      chai.expect(res.writeHead.callCount).to.equal(1);
      chai.expect(res.writeHead.args[0][0]).to.equal(500);
      chai.expect(res.writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal('Server error: "explanation"');
    });

    it('responds with JSON', () => {
      req.get.withArgs('Accept').returns('application/json');
      serverUtils.serverError({ foo: 'bar' }, req, res);
      chai.expect(req.get.callCount).to.equal(1);
      chai.expect(req.get.args[0][0]).to.equal('Accept');
      chai.expect(res.status.callCount).to.equal(1);
      chai.expect(res.status.args[0][0]).to.equal(500);
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal(JSON.stringify({ code: 500, error: 'Server error' }));
    });

    it('handles uncaught payload size exceptions', () => {
      req.get.withArgs('Accept').returns('application/json');
      serverUtils.serverError({ foo: 'bar', type: 'entity.too.large' }, req, res);
      chai.expect(req.get.callCount).to.equal(1);
      chai.expect(req.get.args[0][0]).to.equal('Accept');
      chai.expect(res.status.callCount).to.equal(1);
      chai.expect(res.status.args[0][0]).to.equal(413);
      chai.expect(res.end.callCount).to.equal(1);
      chai.expect(res.end.args[0][0]).to.equal(JSON.stringify({ code: 413, error: 'Payload Too Large' }));
    });

  });

});
