const db = require('../../db'),
      sinon = require('sinon').sandbox.create(),
      serverUtils = require('../../server-utils'),
      req = {
        url: '',
        get: function() {}
      },
      res = {
        writeHead: function() {},
        end: function() {},
        json: function() {},
        redirect: function() {},
        status: function() {}
      };

exports.setUp = callback => {
  db.settings = { db: 'medic' };
  callback();
};

exports.tearDown = callback => {
  sinon.restore();
  db.settings = {};
  callback();
};

exports['error calls serverError when given string'] = test => {
  test.expect(2);
  const serverError = sinon.stub(serverUtils, 'serverError');
  serverUtils.error('some string', req, res);
  test.equals(serverError.callCount, 1);
  test.equals(serverError.args[0][0], 'some string');
  test.done();
};

exports['error calls serverError when given 500 error'] = test => {
  test.expect(2);
  const serverError = sinon.stub(serverUtils, 'serverError');
  serverUtils.error({ code: 500, message: 'some string' }, req, res);
  test.equals(serverError.callCount, 1);
  test.equals(serverError.args[0][0].message, 'some string');
  test.done();
};

exports['error calls notLoggedIn when given 401 error'] = test => {
  test.expect(1);
  const notLoggedIn = sinon.stub(serverUtils, 'notLoggedIn');
  serverUtils.error({ code: 401 }, req, res);
  test.equals(notLoggedIn.callCount, 1);
  test.done();
};

exports['error function handles 503 errors - #3821'] = test => {
  test.expect(5);
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
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 500);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'Server error');
  test.done();
};

exports['error handles unknown errors'] = test => {
  test.expect(5);
  const writeHead = sinon.stub(res, 'writeHead');
  const end = sinon.stub(res, 'end');
  serverUtils.error({ foo: 'bar' }, req, res);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 500);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'Server error');
  test.done();
};

exports['notLoggedIn redirects to login page for human user'] = test => {
  test.expect(3);
  const redirect = sinon.stub(res, 'redirect');
  req.url = 'someurl';
  req.headers = { 'user-agent': 'Mozilla/1.0' };
  serverUtils.notLoggedIn(req, res);
  test.equals(redirect.callCount, 1);
  test.equals(redirect.args[0][0], 301);
  test.equals(redirect.args[0][1], '/medic/login?redirect=someurl');
  test.done();
};

exports['notLoggedIn returns 401 for medic-collect'] = test => {
  test.expect(2);
  const writeHead = sinon.stub(res, 'writeHead');
  req.url = 'someurl';
  req.headers = { 'user-agent': null };
  serverUtils.notLoggedIn(req, res);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 401);
  test.done();
};

exports['notLoggedIn shows prompt if requested'] = test => {
  test.expect(6);
  const writeHead = sinon.stub(res, 'writeHead');
  const end = sinon.stub(res, 'end');
  serverUtils.notLoggedIn(req, res, true);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 401);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(writeHead.args[0][1]['WWW-Authenticate'], 'Basic realm="Medic Mobile Web Services"');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'not logged in');
  test.done();
};

exports['notLoggedIn responds with JSON if requested'] = test => {
  test.expect(7);
  const status = sinon.stub(res, 'status');
  const json = sinon.stub(res, 'json');
  const get = sinon.stub(req, 'get');
  get.returns('application/json');
  serverUtils.notLoggedIn(req, res);
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'Accept');
  test.equals(status.callCount, 1);
  test.equals(status.args[0][0], 401);
  test.equals(json.callCount, 1);
  test.equals(json.args[0][0].error, 'unauthorized');
  test.equals(json.args[0][0].code, 401);
  test.done();
};

exports['serverError does not leak errors information to the client'] = test => {
  test.expect(5);
  const writeHead = sinon.stub(res, 'writeHead');
  const end = sinon.stub(res, 'end');
  serverUtils.serverError('boom', req, res);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 500);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'Server error');
  test.done();
};

exports['serverError responds with JSON'] = test => {
  test.expect(7);
  const status = sinon.stub(res, 'status');
  const json = sinon.stub(res, 'json');
  const get = sinon.stub(req, 'get');
  get.returns('application/json');
  serverUtils.serverError({ foo: 'bar' }, req, res);
  test.equals(get.callCount, 1);
  test.equals(get.args[0][0], 'Accept');
  test.equals(status.callCount, 1);
  test.equals(status.args[0][0], 500);
  test.equals(json.callCount, 1);
  test.equals(json.args[0][0].code, 500);
  test.equals(json.args[0][0].error, 'Server error');
  test.done();
};
