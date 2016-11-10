var proxyquire = require('proxyquire').noCallThru();
var kujuaUtils = proxyquire('../../../packages/kujua-utils/kujua-utils', {
  'cookies': {}
});
var lib = proxyquire('../../../lib/validate_doc_update', {
  'kujua-utils': kujuaUtils
});

var userSettings;

exports.setUp = function(cb) {
  // A valid user-settings doc. Does not require type property because that is
  // already matched before passing to the validation function.
  userSettings = {
    _id: 'org.couchdb.user:sally',
    name: 'sally',
    roles: []
  };
  cb();
};

var testAllowed = function(roles, newDoc, oldDoc) {
  oldDoc = oldDoc || newDoc;
  var userCtx = { name: 'a-user', roles: roles };
  return lib._allowed(newDoc, oldDoc, userCtx, {}).allowed;
};

exports['only db and national admins are allowed change ddocs'] = function(test) {
  var doc = { _id: '_design/something' };
  test.equal(testAllowed([ '_admin' ], doc), true);
  test.equal(testAllowed([ 'national_admin' ], doc), true);
  test.equal(testAllowed([ ], doc), false);
  test.done();
};

exports['only db and national admins are allowed change the resources doc'] = function(test) {
  var doc = { _id: 'resources' };
  test.equal(testAllowed([ '_admin' ], doc), true);
  test.equal(testAllowed([ 'national_admin' ], doc), true);
  test.equal(testAllowed([ ], doc), false);
  test.done();
};

exports['only db and national admins are allowed change appcache doc'] = function(test) {
  var doc = { _id: 'appcache' };
  test.equal(testAllowed([ '_admin' ], doc), true);
  test.equal(testAllowed([ 'national_admin' ], doc), true);
  test.equal(testAllowed([ ], doc), false);
  test.done();
};

exports['only db and national admins are allowed change forms'] = function(test) {
  var doc = { type: 'form' };
  test.equal(testAllowed([ '_admin' ], doc), true);
  test.equal(testAllowed([ 'national_admin' ], doc), true);
  test.equal(testAllowed([ ], doc), false);
  test.done();
};

exports['only db and national admins are allowed change translations'] = function(test) {
  var doc = { type: 'translations' };
  test.equal(testAllowed([ '_admin' ], doc), true);
  test.equal(testAllowed([ 'national_admin' ], doc), true);
  test.equal(testAllowed([ ], doc), false);
  test.done();
};

exports['only db and national admins are allowed change their own place'] = function(test) {
  var doc = { _id: 'abc', type: 'clinic' };
  test.equal(lib._allowed(doc, doc, { name: 'a-user', roles: [ '_admin' ], facility_id: 'abc' }, {}).allowed, true);
  test.equal(lib._allowed(doc, doc, { name: 'a-user', roles: [ 'national_admin' ], facility_id: 'abc' }, {}).allowed, true);
  test.equal(lib._allowed(doc, doc, { name: 'a-user', roles: [ 'district_admin' ], facility_id: 'abc' }, {}).allowed, false);
  test.done();
};

exports['allowed returns false on empty userCtx'] = function(test) {
  test.equal(testAllowed([], {}), false);
  test.done();
};

exports['allowed returns false on userCtx with null name'] = function(test) {
  test.equal(lib._allowed({}, {}, { name: null }).allowed, false);
  test.done();
};

exports['allowed returns true when userCtx has _admin role'] = function(test) {
  test.equal(testAllowed([ '_admin' ], {}), true);
  test.done();
};

exports['validateUserSettings succeeds if doc is valid'] = function(test) {
  test.doesNotThrow(function() {
    lib._validateUserSettings(userSettings);
  });
  test.done();
};

exports['validateUserSettings fails if no name is defined'] = function(test) {
  delete userSettings.name;
  test.throws(function() {
    lib._validateUserSettings(userSettings);
  });
  test.done();
};

exports['validateUserSettings _id prefix must be org.couchdb.user'] = function(test) {
  userSettings._id = 'org.couchdb.foo:sally';
  test.throws(function() {
    lib._validateUserSettings(userSettings);
  });
  test.done();
};

exports['validateUserSettings _id must define a value after :'] = function(test) {
  userSettings._id = 'org.couchdb.foo:';
  test.throws(function() {
    lib._validateUserSettings(userSettings);
  });
  test.done();
};

exports['validateUserSettings name and usernaem must match'] = function(test) {
  userSettings.name = 'foo';
  test.throws(function() {
    lib._validateUserSettings(userSettings);
  });
  test.done();
};

exports['validateUserSettings known must be boolean'] = function(test) {
  userSettings.known = 3;
  test.throws(function() {
    lib._validateUserSettings(userSettings);
  });
  userSettings.known = false;
  test.doesNotThrow(function() {
    lib._validateUserSettings(userSettings);
  });
  test.done();
};

exports['validateUserSettings roles must exist'] = function(test) {
  delete userSettings.roles;
  test.throws(function() {
    lib._validateUserSettings(userSettings);
  });
  test.done();
};

exports['validate person requires reported_date'] = function(test) {
  var userCtx = {
    name: 'a',
    roles: ['_admin']
  };
  test.throws(function() {
    lib.validate_doc_update({ type: 'person' }, {}, userCtx, {});
  });
  test.done();
};
