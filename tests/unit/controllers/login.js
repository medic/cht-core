var controller = require('../../../controllers/login'),
    _ = require('underscore'),
    db = require('../../../db'),
    auth = require('../../../auth'),
    sinon = require('sinon').sandbox.create(),
    config = require('../../../config'),
    request = require('request'),
    fs = require('fs'),
    DB_NAME = 'lg',
    DDOC_NAME = 'medic',
    req,
    res;

exports.setUp = function(callback) {
  req = {
    query: {},
    body: {}
  };
  res = {
    redirect: function() {},
    send: function() {},
    status: function() {},
    json: function() {},
    cookie: function() {}
  };
  db.settings = {
    db: DB_NAME,
    ddoc: DDOC_NAME,
    protocol: 'http',
    host: 'test.com',
    port: 1234,
    pathname: 'sesh'
  };
  callback();
};

exports.tearDown = function(callback) {
  db.settings = {};
  sinon.restore();
  callback();
};

[
  '',
  null,
  'http://example.com',
  '%22%3E%3Cscript%3Ealert%28%27hello%27%29%3C/script%3E',
  'https://app.medicmobile.org/wrong/path',
  'http://app.medicmobile.org/lg/_design/medic/_rewrite', // wrong protocol
  '/lg/_design/medic/_rewrite/../../../../../.htpasswd',
  '/lg/_design/medic/_rewrite_gone_bad',
].forEach(function(requested) {
  exports['Bad URL "' + requested + '" should redirect to root'] = function(test) {
    test.equals('/lg/_design/medic/_rewrite', controller.safePath(requested));
    test.done();
  };
});

[
  '/lg/_design/medic/_rewrite',
  '/lg/_design/medic/_rewrite/',
  '/lg/_design/medic/_rewrite#fragment',
  '/lg/_design/medic/_rewrite#path/fragment',
  '/lg/_design/medic/_rewrite/long/path',
].forEach(function(requested) {
  exports['Good URL "' + requested + '" should redirect unchanged'] = function(test) {
    test.equals(requested, controller.safePath(requested));
    test.done();
  };
});

_.forEach({
  'http://test.com:1234/lg/_design/medic/_rewrite': '/lg/_design/medic/_rewrite',
  'http://test.com:1234/lg/_design/medic/_rewrite#fragment': '/lg/_design/medic/_rewrite#fragment',
  'http://wrong.com:666/lg/_design/medic/_rewrite#path/fragment': '/lg/_design/medic/_rewrite#path/fragment',
  'http://wrong.com:666/lg/_design/medic/_rewrite/long/path': '/lg/_design/medic/_rewrite/long/path',
}, function(expected, requested) {
  exports['Absolute URL "' + requested + '" should redirect as a relative url'] = function(test) {
    test.equals(expected, controller.safePath(requested));
    test.done();
  };
});

exports['when already logged in redirect to app'] = function(test) {
  test.expect(7);
  var getUserCtx = sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, { name: 'josh' });
  var redirect = sinon.stub(res, 'redirect');
  var cookie = sinon.stub(res, 'cookie').returns(res);
  controller.get(req, res);
  test.equals(getUserCtx.callCount, 1);
  test.same(getUserCtx.args[0][0], req);
  test.equals(cookie.callCount, 1);
  test.equals(cookie.args[0][0], 'userCtx');
  test.equals(cookie.args[0][1], '{"name":"josh"}');
  test.equals(redirect.callCount, 1);
  test.equals(redirect.args[0][0], '/lg/_design/medic/_rewrite');
  test.done();
};

exports['when not logged in send login page'] = function(test) {
  test.expect(5);
  var getUserCtx = sinon.stub(auth, 'getUserCtx').callsArgWith(1, 'not logged in');
  var send = sinon.stub(res, 'send');
  var readFile = sinon.stub(fs, 'readFile').callsArgWith(2, null, 'LOGIN PAGE GOES HERE. {{translations.login}}');
  sinon.stub(config, 'translate').returns('TRANSLATED VALUE.');
  controller.get(req, res);
  test.equals(getUserCtx.callCount, 1);
  test.same(getUserCtx.args[0][0], req);
  test.equals(send.callCount, 1);
  test.equals(send.args[0][0], 'LOGIN PAGE GOES HERE. TRANSLATED VALUE.');
  test.equals(readFile.callCount, 1);
  test.done();
};

exports['post returns errors from session create'] = function(test) {
  test.expect(5);
  req.body = { user: 'sharon', password: 'p4ss' };
  var post = sinon.stub(request, 'post').callsArgWith(1, 'boom');
  var status = sinon.stub(res, 'status').returns(res);
  var json = sinon.stub(res, 'json').returns(res);
  controller.post(req, res);
  test.equals(post.callCount, 1);
  test.equals(status.callCount, 1);
  test.equals(status.args[0][0], 500);
  test.equals(json.callCount, 1);
  test.same(json.args[0][0], { error: 'Unexpected error logging in' });
  test.done();
};

exports['post returns invalid credentials'] = function(test) {
  test.expect(5);
  req.body = { user: 'sharon', password: 'p4ss' };
  var post = sinon.stub(request, 'post').callsArgWith(1, null, { statusCode: 401 });
  var status = sinon.stub(res, 'status').returns(res);
  var json = sinon.stub(res, 'json').returns(res);
  controller.post(req, res);
  test.equals(post.callCount, 1);
  test.equals(status.callCount, 1);
  test.equals(status.args[0][0], 401);
  test.equals(json.callCount, 1);
  test.same(json.args[0][0], { error: 'Not logged in' });
  test.done();
};

exports['post returns errors from auth'] = function(test) {
  test.expect(6);
  req.body = { user: 'sharon', password: 'p4ss' };
  var postResponse = {
    statusCode: 200,
    headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
  };
  var post = sinon.stub(request, 'post').callsArgWith(1, null, postResponse);
  var status = sinon.stub(res, 'status').returns(res);
  var json = sinon.stub(res, 'json').returns(res);
  var getUserCtx = sinon.stub(auth, 'getUserCtx').callsArgWith(1, 'boom');
  controller.post(req, res);
  test.equals(post.callCount, 1);
  test.equals(getUserCtx.callCount, 1);
  test.equals(status.callCount, 1);
  test.equals(status.args[0][0], 401);
  test.equals(json.callCount, 1);
  test.same(json.args[0][0], { error: 'Error getting authCtx' });
  test.done();
};

exports['post logs in successfully'] = function(test) {
  test.expect(15);
  req.body = { user: 'sharon', password: 'p4ss' };
  var postResponse = {
    statusCode: 200,
    headers: { 'set-cookie': [ 'AuthSession=abc;' ] }
  };
  var post = sinon.stub(request, 'post').callsArgWith(1, null, postResponse);
  var json = sinon.stub(res, 'json').returns(res);
  var cookie = sinon.stub(res, 'cookie').returns(res);
  var userCtx = { name: 'shazza', roles: [ 'project-stuff' ] };
  var getUserCtx = sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  controller.post(req, res);
  test.equals(post.callCount, 1);
  test.equals(post.args[0][0].url, 'http://test.com:1234/_session');
  test.equals(post.args[0][0].body.name, 'sharon');
  test.equals(post.args[0][0].body.password, 'p4ss');
  test.equals(post.args[0][0].auth.user, 'sharon');
  test.equals(post.args[0][0].auth.pass, 'p4ss');
  test.equals(getUserCtx.callCount, 1);
  test.equals(getUserCtx.args[0][0].headers.Cookie, 'AuthSession=abc;');
  test.equals(json.callCount, 1);
  test.same(json.args[0][0], { success: true });
  test.equals(cookie.callCount, 2);
  test.equals(cookie.args[0][0], 'AuthSession');
  test.equals(cookie.args[0][1], 'abc');
  test.equals(cookie.args[1][0], 'userCtx');
  test.equals(cookie.args[1][1], JSON.stringify(userCtx));
  test.done();
};
