var _ = require('underscore'),
    proxyquire = require('proxyquire').noCallThru(),
    serverValidateDocUpdate = proxyquire('../../../lib/validate_doc_update', {
      'kujua-utils': require('../../../packages/kujua-utils/kujua-utils')
    });

var fs = require('fs'),
    clientValidateDocUpdateString = fs.readFileSync('./ddocs/medic-client/validate_doc_update.js'),
    clientValidateDocUpdate = function() {
      /*jshint -W061 */
      eval('('+clientValidateDocUpdateString+')').apply(null, arguments);
    };
var userSettings;

exports.setUp = function(cb) {
  // A valid user-settings doc. Does not require type property because that is
  // already matched before passing to the validation function.
  userSettings = {
    _id: 'org.couchdb.user:sally',
    name: 'sally',
    type: 'user-settings',
    roles: []
  };
  cb();
};

var userCtx = function(additions) {
  additions = additions || {};
  return _.defaults(additions, { name: 'a-user' });
};

var checkFn = function(lib, userCtx, newDoc, oldDoc) {
  oldDoc = oldDoc || newDoc;
  try {
    lib(newDoc, oldDoc, userCtx, {});
    return true;
  } catch (error) {
    return error;
  }
};

var disallowed = function (reason) {
  return { forbidden: reason };
};

var allowedOnServer = _.partial(checkFn, serverValidateDocUpdate.validate_doc_update);
var allowedOnClient = _.partial(checkFn, clientValidateDocUpdate);

exports['only db and national admins are allowed change ddocs'] = function(test) {
  var doc = { _id: '_design/something' };
  test.ok(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
  test.ok(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
  test.deepEqual(allowedOnServer(userCtx({roles: [ ]}), doc), disallowed('You are not authorized to edit admin only docs'));
  test.done();
};

exports['only db and national admins are allowed change the resources doc'] = function(test) {
  var doc = { _id: 'resources' };
  test.ok(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
  test.ok(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
  test.deepEqual(allowedOnServer(userCtx({roles: [ ]}), doc), disallowed('You are not authorized to edit admin only docs'));
  test.done();
};

exports['only db and national admins are allowed change appcache doc'] = function(test) {
  var doc = { _id: 'appcache' };
  test.ok(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
  test.ok(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
  test.deepEqual(allowedOnServer(userCtx({roles: [ ]}), doc), disallowed('You are not authorized to edit admin only docs'));
  test.done();
};

exports['only db and national admins are allowed change forms'] = function(test) {
  var doc = { type: 'form' };
  test.ok(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
  test.ok(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
  test.deepEqual(allowedOnServer(userCtx({roles: [ ]}), doc), disallowed('You are not authorized to edit admin only docs'));
  test.done();
};

exports['only db and national admins are allowed change translations'] = function(test) {
  var doc = { type: 'translations' };
  test.ok(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
  test.ok(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
  test.deepEqual(allowedOnServer(userCtx({roles: [ ]}), doc), disallowed('You are not authorized to edit admin only docs'));
  test.done();
};

exports['only db and national admins are allowed change their own place'] = function(test) {
  var doc = { _id: 'abc', type: 'clinic' };
  test.ok(allowedOnServer(userCtx({roles: [ '_admin' ], facility_id: 'abc' }), doc));
  test.ok(allowedOnServer(userCtx({roles: [ 'national_admin' ], facility_id: 'abc' }), doc));
  test.deepEqual(allowedOnServer(userCtx({roles: [ 'district_admin' ], facility_id: 'abc' }), doc), disallowed('You are not authorized to edit your own place'));
  test.done();
};

exports['allowed returns false on empty userCtx'] = function(test) {
  test.deepEqual(allowedOnServer({}, {}), disallowed('You must be logged in to edit documents'));
  test.done();
};

exports['allowed returns false on userCtx with null name'] = function(test) {
  test.deepEqual(allowedOnServer({ name: null }, {}), disallowed('You must be logged in to edit documents'));
  test.done();
};

exports['allowed returns true when userCtx has _admin role'] = function(test) {
  test.ok(allowedOnServer(userCtx({roles: [ '_admin' ]}, {})));
  test.done();
};

exports['validateUserSettings succeeds if doc is valid'] = function(test) {
  test.ok(allowedOnClient(userCtx(), userSettings));
  test.done();
};

exports['validateUserSettings fails if no name is defined'] = function(test) {
  delete userSettings.name;
  test.deepEqual(allowedOnClient(userCtx(), userSettings), disallowed('name property must be equivalent to username. e.g. "org.couchdb.user:sally"'));
  test.done();
};

exports['validateUserSettings _id prefix must be org.couchdb.user'] = function(test) {
  userSettings._id = 'org.couchdb.foo:sally';
  test.deepEqual(allowedOnClient(userCtx(), userSettings), disallowed('_id must be prefixed with "org.couchdb.user:". e.g. "org.couchdb.user:sally"'));
  test.done();
};

exports['validateUserSettings _id must define a value after :'] = function(test) {
  userSettings._id = 'org.couchdb.user:';
  test.deepEqual(allowedOnClient(userCtx(), userSettings), disallowed('_id must define a value after "org.couchdb.user:". e.g. "org.couchdb.user:sally"'));
  test.done();
};

exports['validateUserSettings name and usernaem must match'] = function(test) {
  userSettings.name = 'foo';
  test.deepEqual(allowedOnClient(userCtx(), userSettings), disallowed('name property must be equivalent to username. e.g. "org.couchdb.user:sally"'));
  test.done();
};

exports['validateUserSettings known must be boolean'] = function(test) {
  userSettings.known = 3;
  test.deepEqual(allowedOnClient(userCtx(), userSettings), disallowed('known is not a boolean.'));
  userSettings.known = false;
  test.ok(allowedOnClient(userCtx(), userSettings));
  test.done();
};

exports['validateUserSettings roles must exist'] = function(test) {
  delete userSettings.roles;
  test.deepEqual(allowedOnClient(userCtx(), userSettings), disallowed('roles is a required array'));
  test.done();
};

exports['validate person requires reported_date'] = function(test) {
  var userCtx = {
    name: 'a',
    roles: ['_admin']
  };
  test.deepEqual(allowedOnClient(userCtx, { _id: 'a-place', type: 'person'}), disallowed('reported_date property must be set.'));
  test.done();
};
