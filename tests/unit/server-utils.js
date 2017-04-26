var db = require('../../db'),
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

exports.setUp = function(callback) {
  db.settings = { db: 'medic' };
  callback();
};

exports.tearDown = function (callback) {
  sinon.restore();
  db.settings = {};
  callback();
};

exports['error calls serverError when given string'] = function(test) {
  test.expect(2);
  var serverError = sinon.stub(serverUtils, 'serverError');
  serverUtils.error('some string', req, res);
  test.equals(serverError.callCount, 1);
  test.equals(serverError.args[0][0], 'some string');
  test.done();
};

exports['error calls serverError when given 500 error'] = function(test) {
  test.expect(2);
  var serverError = sinon.stub(serverUtils, 'serverError');
  serverUtils.error({ code: 500, message: 'some string' }, req, res);
  test.equals(serverError.callCount, 1);
  test.equals(serverError.args[0][0].message, 'some string');
  test.done();
};

exports['error calls notLoggedIn when given 401 error'] = function(test) {
  test.expect(1);
  var notLoggedIn = sinon.stub(serverUtils, 'notLoggedIn');
  serverUtils.error({ code: 401 }, req, res);
  test.equals(notLoggedIn.callCount, 1);
  test.done();
};

exports['error handles node errors'] = function(test) {
  test.expect(5);
  var writeHead = sinon.stub(res, 'writeHead');
  var end = sinon.stub(res, 'end');
  serverUtils.error({ code: 503, message: 'some error' }, req, res);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 503);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'some error');
  test.done();
};

exports['error handles nano errors'] = function(test) {
  test.expect(5);
  var writeHead = sinon.stub(res, 'writeHead');
  var end = sinon.stub(res, 'end');
  serverUtils.error({ statusCode: 503, reason: 'some error' }, req, res);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 503);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'some error');
  test.done();
};

exports['error handles unknown errors'] = function(test) {
  test.expect(5);
  var writeHead = sinon.stub(res, 'writeHead');
  var end = sinon.stub(res, 'end');
  serverUtils.error({ foo: 'bar' }, req, res);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 500);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'Server error');
  test.done();
};

exports['notLoggedIn redirects to login page for human user'] = function(test) {
  test.expect(3);
  var redirect = sinon.stub(res, 'redirect');
  req.url = 'someurl';
  req.headers = { 'user-agent': 'Mozilla/1.0' };
  serverUtils.notLoggedIn(req, res);
  test.equals(redirect.callCount, 1);
  test.equals(redirect.args[0][0], 301);
  test.equals(redirect.args[0][1], '/medic/login?redirect=someurl');
  test.done();
};

exports['notLoggedIn returns 401 for medic-collect'] = function(test) {
  test.expect(2);
  var writeHead = sinon.stub(res, 'writeHead');
  req.url = 'someurl';
  req.headers = { 'user-agent': null };
  serverUtils.notLoggedIn(req, res);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 401);
  test.done();
};

exports['notLoggedIn shows prompt if requested'] = function(test) {
  test.expect(6);
  var writeHead = sinon.stub(res, 'writeHead');
  var end = sinon.stub(res, 'end');
  serverUtils.notLoggedIn(req, res, true);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 401);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(writeHead.args[0][1]['WWW-Authenticate'], 'Basic realm="Medic Mobile Web Services"');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'not logged in');
  test.done();
};

exports['notLoggedIn responds with JSON if requested'] = function(test) {
  test.expect(7);
  var status = sinon.stub(res, 'status');
  var json = sinon.stub(res, 'json');
  var get = sinon.stub(req, 'get');
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

exports['serverError does not leak errors information to the client'] = function(test) {
  test.expect(5);
  var writeHead = sinon.stub(res, 'writeHead');
  var end = sinon.stub(res, 'end');
  serverUtils.serverError('boom', req, res);
  test.equals(writeHead.callCount, 1);
  test.equals(writeHead.args[0][0], 500);
  test.equals(writeHead.args[0][1]['Content-Type'], 'text/plain');
  test.equals(end.callCount, 1);
  test.equals(end.args[0][0], 'Server error');
  test.done();
};

exports['serverError responds with JSON'] = function(test) {
  test.expect(7);
  var status = sinon.stub(res, 'status');
  var json = sinon.stub(res, 'json');
  var get = sinon.stub(req, 'get');
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
