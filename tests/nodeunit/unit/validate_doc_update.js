var proxyquire = require('proxyquire').noCallThru();

var kujuaUtils = {
  isUserAdmin: function() {
    return false;
  },
  isUserDistrictAdmin: function() {
    return false;
  },
  hasRole: function() {
    return false;
  }
};

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
    known: false,
    roles: []
  };
  cb();
};

exports['allowed returns false on empty userCtx'] = function(test) {
  test.equal(lib._allowed({}, {}, {}).allowed, false);
  test.done();
};

exports['allowed returns false on userCtx with null name'] = function(test) {
  test.equal(lib._allowed({}, {}, {name: null}).allowed, false);
  test.done();
};

exports['allowed returns truen when userCtx has _admin role'] = function(test) {
  var userCtx = {
    name: 'a',
    roles: ['_admin']
  };
  test.equal(lib._allowed({}, {}, userCtx).allowed, true);
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
  test.done();
};

exports['validateUserSettings roles must exist'] = function(test) {
  delete userSettings.roles;
  test.throws(function() {
    lib._validateUserSettings(userSettings);
  });
  test.done();
};
