var controller = require('../../controllers/login'),
    db = require('../../db'),
    // auth = require('../../auth'),
    DB_NAME = 'lg',
    DDOC_NAME = 'medic';

exports.setUp = function(callback) {
  db.settings = {
    db: DB_NAME,
    ddoc: DDOC_NAME
  };
  callback();
};

exports.tearDown = function(callback) {
  db.settings = {};
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
    test.same('/lg/_design/medic/_rewrite/', controller.safePath(requested));
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
    test.same(requested, controller.safePath(requested));
    test.done();
  };
});

