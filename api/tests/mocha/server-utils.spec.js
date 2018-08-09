const sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../src/db-nano'),
      serverUtils = require('../../src/server-utils'),
      req = {
        url: '',
        get: () => {}
      },
      res = {
        writeHead: () => {},
        end: () => {},
        json: () => {},
        redirect: () => {},
        status: () => {}
      };

let originalDbSettings;

describe('Server utils', () => {

  beforeEach(() => {
    originalDbSettings = db.settings;
    db.settings = { db: 'medic' };
  });

  afterEach(() => {
    sinon.restore();
    db.settings = originalDbSettings;
  });

  it('error calls serverError when given string', () => {
    const serverError = sinon.stub(serverUtils, 'serverError');
    serverUtils.error('some string', req, res);
    chai.expect(serverError.callCount).to.equal(1);
    chai.expect(serverError.args[0][0]).to.equal('some string');
  });

  it('error calls serverError when given 500 error', () => {
    const serverError = sinon.stub(serverUtils, 'serverError');
    serverUtils.error({ code: 500, message: 'some string' }, req, res);
    chai.expect(serverError.callCount).to.equal(1);
    chai.expect(serverError.args[0][0].message).to.equal('some string');
  });

  it('error calls notLoggedIn when given 401 error', () => {
    const notLoggedIn = sinon.stub(serverUtils, 'notLoggedIn');
    serverUtils.error({ code: 401 }, req, res);
    chai.expect(notLoggedIn.callCount).to.equal(1);
  });

  it('error function handles 503 errors - #3821', () => {
    const writeHead = sinon.stub(res, 'writeHead');
    const end = sinon.stub(res, 'end');
    // an example error thrown by the `request` library
    const error = {
      code: 503,
      message: {
        message: 'connect ECONNREFUSED 127.0.0.1:5985',
        stack: 'Error: connect ECONNREFUSED 127.0.0.1:5985\n    at Object.exports._errnoException (util.js:1016:11)\n    at exports._exceptionWithHostPort (util.js:1039:20)\n    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1138:14)',
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

  it('error handles unknown errors', () => {
    const writeHead = sinon.stub(res, 'writeHead');
    const end = sinon.stub(res, 'end');
    serverUtils.error({ foo: 'bar' }, req, res);
    chai.expect(writeHead.callCount).to.equal(1);
    chai.expect(writeHead.args[0][0]).to.equal(500);
    chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
    chai.expect(end.callCount).to.equal(1);
    chai.expect(end.args[0][0]).to.equal('Server error');
  });

  it('notLoggedIn redirects to login page for human user', () => {
    const redirect = sinon.stub(res, 'redirect');
    req.url = 'someurl';
    req.headers = { 'user-agent': 'Mozilla/1.0' };
    serverUtils.notLoggedIn(req, res);
    chai.expect(redirect.callCount).to.equal(1);
    chai.expect(redirect.args[0][0]).to.equal(302);
    chai.expect(redirect.args[0][1]).to.equal('/medic/login?redirect=someurl');
  });

  it('notLoggedIn returns 401 for medic-collect', () => {
    const writeHead = sinon.stub(res, 'writeHead');
    req.url = 'someurl';
    req.headers = { 'user-agent': null };
    serverUtils.notLoggedIn(req, res);
    chai.expect(writeHead.callCount).to.equal(1);
    chai.expect(writeHead.args[0][0]).to.equal(401);
  });

  it('notLoggedIn shows prompt if requested', () => {
    const writeHead = sinon.stub(res, 'writeHead');
    const end = sinon.stub(res, 'end');
    serverUtils.notLoggedIn(req, res, true);
    chai.expect(writeHead.callCount).to.equal(1);
    chai.expect(writeHead.args[0][0]).to.equal(401);
    chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
    chai.expect(writeHead.args[0][1]['WWW-Authenticate']).to.equal('Basic realm="Medic Mobile Web Services"');
    chai.expect(end.callCount).to.equal(1);
    chai.expect(end.args[0][0]).to.equal('not logged in');
  });

  it('notLoggedIn responds with JSON if requested', () => {
    const status = sinon.stub(res, 'status');
    const json = sinon.stub(res, 'json');
    const get = sinon.stub(req, 'get');
    get.returns('application/json');
    serverUtils.notLoggedIn(req, res);
    chai.expect(get.callCount).to.equal(1);
    chai.expect(get.args[0][0]).to.equal('Accept');
    chai.expect(status.callCount).to.equal(1);
    chai.expect(status.args[0][0]).to.equal(401);
    chai.expect(json.callCount).to.equal(1);
    chai.expect(json.args[0][0].error).to.equal('unauthorized');
    chai.expect(json.args[0][0].code).to.equal(401);
  });

  it('serverError does not leak errors information to the client', () => {
    const writeHead = sinon.stub(res, 'writeHead');
    const end = sinon.stub(res, 'end');
    serverUtils.serverError('boom', req, res);
    chai.expect(writeHead.callCount, 1);
    chai.expect(writeHead.args[0][0]).to.equal(500);
    chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
    chai.expect(end.callCount).to.equal(1);
    chai.expect(end.args[0][0]).to.equal('Server error');
  });

  it('serverError() shares public information with the client', () => {
    const writeHead = sinon.stub(res, 'writeHead');
    const end = sinon.stub(res, 'end');
    serverUtils.serverError({ publicMessage: 'explanation' }, req, res);
    chai.expect(writeHead.callCount).to.equal(1);
    chai.expect(writeHead.args[0][0]).to.equal(500);
    chai.expect(writeHead.args[0][1]['Content-Type']).to.equal('text/plain');
    chai.expect(end.callCount).to.equal(1);
    chai.expect(end.args[0][0]).to.equal('Server error: explanation');
  });

  it('serverError responds with JSON', () => {
    const status = sinon.stub(res, 'status');
    const json = sinon.stub(res, 'json');
    const get = sinon.stub(req, 'get');
    get.returns('application/json');
    serverUtils.serverError({ foo: 'bar' }, req, res);
    chai.expect(get.callCount).to.equal(1);
    chai.expect(get.args[0][0]).to.equal('Accept');
    chai.expect(status.callCount).to.equal(1);
    chai.expect(status.args[0][0]).to.equal(500);
    chai.expect(json.callCount).to.equal(1);
    chai.expect(json.args[0][0].code).to.equal(500);
    chai.expect(json.args[0][0].error).to.equal('Server error');
  });

});
