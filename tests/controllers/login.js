var controller = require('../../controllers/login'),
    db = require('../../db'),
    auth = require('../../auth'),
    sinon = require('sinon'),
    utils = require('../utils'),
    config = require('../../config'),
    fs = require('fs'),
    DB_NAME = 'lg',
    DDOC_NAME = 'medic',
    req,
    res;

exports.setUp = function(callback) {
  req = {
    query: {}
  };
  res = {
    redirect: function() {},
    send: function() {}
  };
  db.settings = {
    db: DB_NAME,
    ddoc: DDOC_NAME
  };
  callback();
};

exports.tearDown = function(callback) {
  db.settings = {};
  utils.restore(auth.getUserCtx, fs.readFile, config.translate);
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
].forEach(function(requested) {
  exports['Bad URL "' + requested + '" should redirect to root'] = function(test) {
    test.equals('/lg/_design/medic/_rewrite/', controller.safePath(requested));
    test.done();
  };
});

[
  '/lg/_design/medic/_rewrite',
  '/lg/_design/medic/_rewrite#fragment',
  '/lg/_design/medic/_rewrite#path/fragment',
  '/lg/_design/medic/_rewrite/long/path',
].forEach(function(requested) {
  exports['Good URL "' + requested + '" should redirect unchanged'] = function(test) {
    test.equals(requested, controller.safePath(requested));
    test.done();
  };
});

exports['when already logged in redirect to app'] = function(test) {
  test.expect(4);
  var getUserCtx = sinon.stub(auth, 'getUserCtx').callsArgWith(1);
  var redirect = sinon.stub(res, 'redirect');
  controller.get(req, res);
  test.equals(getUserCtx.callCount, 1);
  test.same(getUserCtx.args[0][0], req);
  test.equals(redirect.callCount, 1);
  test.equals(redirect.args[0][0], '/lg/_design/medic/_rewrite/');
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