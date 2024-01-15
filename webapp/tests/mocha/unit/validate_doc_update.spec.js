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
    eval('log = console.log; (' + fn + ')').apply(null, arguments);
  };

  const serverValidateDocUpdate = function() {
    const fn = fs.readFileSync('./ddocs/medic-db/medic/validate_doc_update.js');
    eval('log = console.log; (' + fn + ')').apply(null, arguments);
  };

  const allowedOnServer = _.partial(checkFn, serverValidateDocUpdate);
  const allowedOnClient = _.partial(checkFn, clientValidateDocUpdate);

  describe('only db and national admins are allowed to change...', () => {
    Object.entries({
      'ddocs': { _id: '_design/something' },
      'resources doc': { _id: 'resources' },
      'service-worker-meta doc': { _id: 'service-worker-meta' },
      'forms': { type: 'form' },
      'translations': { type: 'translations' },
      'extension-libs': { _id: 'extension-libs' },
      'header logo': { _id: 'branding' },
      'partners': { _id: 'partners' }
    }).forEach(([ name, doc ]) => {
      it(name, done => {
        assert.equal(allowedOnServer(userCtx( {roles: [ '_admin' ] }), doc), true);
        assert.deepEqual(
          allowedOnServer(userCtx({ roles: [ 'national_admin' ] }), doc),
          { forbidden: 'You are not authorized to edit admin only docs' }
        );
        assert.deepEqual(
          allowedOnServer(userCtx({ roles: [ 'test' ] }), doc),
          disallowed('You are not authorized to edit admin only docs')
        );
        done();
      });
    });
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

  it('validateUserSettings name and username must match', done => {
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
