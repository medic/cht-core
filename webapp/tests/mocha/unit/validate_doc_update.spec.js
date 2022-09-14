const _ = require('lodash');
const fs = require('fs');
const assert = require('chai').assert;

let userSettings;

describe('validate doc update', () => {

  beforeEach(done => {
    // A valid user-settings doc. Does not require type property because that is
    // already matched before passing to the validation function.
    userSettings = {
      _id: 'org.couchdb.user:sally',
      name: 'sally',
      type: 'user-settings',
      roles: []
    };
    done();
  });

  const userCtx = function(additions) {
    additions = additions || {};
    return _.defaults(additions, { name: 'a-user' });
  };

  const checkFn = function(lib, userCtx, newDoc, oldDoc) {
    oldDoc = oldDoc || newDoc;
    try {
      lib(newDoc, oldDoc, userCtx, {});
      return true;
    } catch (error) {
      return error;
    }
  };

  const disallowed = function (reason) {
    return { forbidden: reason };
  };

  const clientValidateDocUpdate = function() {
    const fn = fs.readFileSync('./ddocs/medic-db/medic-client/validate_doc_update.js');
    eval('(' + fn + ')').apply(null, arguments);
  };

  const serverValidateDocUpdate = function() {
    const fn = fs.readFileSync('./ddocs/medic-db/medic/validate_doc_update.js');
    eval('(' + fn + ')').apply(null, arguments);
  };

  const allowedOnServer = _.partial(checkFn, serverValidateDocUpdate);
  const allowedOnClient = _.partial(checkFn, clientValidateDocUpdate);

  it('only db and national admins are allowed change ddocs', done => {
    const doc = { _id: '_design/something' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ ]}), doc),
      disallowed('You are not authorized to edit admin only docs')
    );
    done();
  });

  it('only db and national admins are allowed change the resources doc', done => {
    const doc = { _id: 'resources' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ ]}), doc),
      disallowed('You are not authorized to edit admin only docs')
    );
    done();
  });

  it('only db and national admins are allowed change service-worker-meta doc', done => {
    const doc = { _id: 'service-worker-meta' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ ]}), doc),
      disallowed('You are not authorized to edit admin only docs')
    );
    done();
  });

  it('only db and national admins are allowed change forms', done => {
    const doc = { type: 'form' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ ]}), doc),
      disallowed('You are not authorized to edit admin only docs')
    );
    done();
  });

  it('only db and national admins are allowed change translations', done => {
    const doc = { type: 'translations' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ ]}), doc),
      disallowed('You are not authorized to edit admin only docs')
    );
    done();
  });

  it('only db and national admins are allowed change their own place', done => {
    const doc = { _id: 'abc', type: 'clinic' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ], facility_id: 'abc' }), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ], facility_id: 'abc' }), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ 'district_admin' ], facility_id: 'abc' }), doc),
      disallowed('You are not authorized to edit your own place')
    );
    done();
  });

  it('only db and national admins are allowed to change header logo', done => {
    const doc = { _id: 'branding' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ ]}), doc),
      disallowed('You are not authorized to edit admin only docs')
    );
    done();
  });

  it('only db and national admins are allowed to add partners', done => {
    const doc = { _id: 'partners' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ]}), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ ]}), doc),
      disallowed('You are not authorized to edit admin only docs')
    );
    done();
  });

  it('allowed returns false on empty userCtx', done => {
    assert.deepEqual(
      allowedOnServer({}, {}),
      disallowed('You must be logged in to edit documents')
    );
    done();
  });

  it('allowed returns false on userCtx with null name', done => {
    assert.deepEqual(
      allowedOnServer({ name: null }, {}),
      disallowed('You must be logged in to edit documents')
    );
    done();
  });

  it('allowed returns true when userCtx has _admin role', done => {
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}, {})));
    done();
  });

  it('validateUserSettings succeeds if doc is valid', done => {
    assert.isOk(allowedOnClient(userCtx(), userSettings));
    done();
  });

  it('validateUserSettings fails if no name is defined', done => {
    delete userSettings.name;
    assert.deepEqual(
      allowedOnClient(userCtx(), userSettings),
      disallowed('name property must be equivalent to username. e.g. "org.couchdb.user:sally"')
    );
    done();
  });

  it('validateUserSettings _id prefix must be org.couchdb.user', done => {
    userSettings._id = 'org.couchdb.foo:sally';
    assert.deepEqual(
      allowedOnClient(userCtx(), userSettings),
      disallowed('_id must be prefixed with "org.couchdb.user:". e.g. "org.couchdb.user:sally"')
    );
    done();
  });

  it('validateUserSettings _id must define a value after :', done => {
    userSettings._id = 'org.couchdb.user:';
    assert.deepEqual(
      allowedOnClient(userCtx(), userSettings),
      disallowed('_id must define a value after "org.couchdb.user:". e.g. "org.couchdb.user:sally"')
    );
    done();
  });

  it('validateUserSettings name and usernaem must match', done => {
    userSettings.name = 'foo';
    assert.deepEqual(
      allowedOnClient(userCtx(), userSettings),
      disallowed('name property must be equivalent to username. e.g. "org.couchdb.user:sally"')
    );
    done();
  });

  it('validateUserSettings known must be boolean', done => {
    userSettings.known = 3;
    assert.deepEqual(
      allowedOnClient(userCtx(), userSettings),
      disallowed('known is not a boolean.')
    );
    userSettings.known = false;
    assert.isOk(allowedOnClient(userCtx(), userSettings));
    done();
  });

  it('validateUserSettings roles must exist', done => {
    delete userSettings.roles;
    assert.deepEqual(
      allowedOnClient(userCtx(), userSettings),
      disallowed('roles is a required array')
    );
    done();
  });

});
