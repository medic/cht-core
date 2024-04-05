const _ = require('lodash');
const fs = require('fs');
const assert = require('chai').assert;

let userSettings;

describe('validate doc update', () => {

  const wrapValidateDocUpdate = (file) => eval(`log = console.log; (${fs.readFileSync(__dirname + file)})`);
  const serverFn = wrapValidateDocUpdate('/../../../../ddocs/medic-db/medic/validate_doc_update.js');
  const clientFn = wrapValidateDocUpdate('/../../../../ddocs/medic-db/medic-client/validate_doc_update.js');

  beforeEach(() => {
    // A valid user-settings doc. Does not require type property because that is
    // already matched before passing to the validation function.
    userSettings = {
      _id: 'org.couchdb.user:sally',
      name: 'sally',
      type: 'user-settings',
      roles: []
    };
  });

  const userCtx = (additions) => {
    additions = additions || {};
    return _.defaults(additions, { name: 'a-user' });
  };

  const checkFn = (lib, userCtx, newDoc, oldDoc) => {
    oldDoc = oldDoc || newDoc;
    try {
      lib(newDoc, oldDoc, userCtx, {});
      return true;
    } catch (error) {
      return error;
    }
  };

  const disallowed = (reason) => {
    return { forbidden: reason };
  };

  const allowedOnServer = (userCtx, newDoc, oldDoc) => checkFn(serverFn, userCtx, newDoc, oldDoc);
  const allowedOnClient = (userCtx, newDoc, oldDoc) => checkFn(clientFn, userCtx, newDoc, oldDoc);

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
      it(name, () => {
        assert.equal(allowedOnServer(userCtx( {roles: [ '_admin' ] }), doc), true);
        assert.deepEqual(
          allowedOnServer(userCtx({ roles: [ 'national_admin' ] }), doc),
          { forbidden: 'You are not authorized to edit admin only docs' }
        );
        assert.deepEqual(
          allowedOnServer(userCtx({ roles: [ 'test' ] }), doc),
          disallowed('You are not authorized to edit admin only docs')
        );
      });
    });
  });

  it('only db and national admins are allowed change their own place', () => {
    const doc = { _id: 'abc', type: 'clinic' };
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ], facility_id: 'abc' }), doc));
    assert.isOk(allowedOnServer(userCtx({roles: [ 'national_admin' ], facility_id: 'abc' }), doc));
    assert.deepEqual(
      allowedOnServer(userCtx({roles: [ 'district_admin' ], facility_id: 'abc' }), doc),
      disallowed('You are not authorized to edit your own place')
    );
  });

  it('allowed returns false on empty userCtx', () => {
    assert.deepEqual(
      allowedOnServer({}, {}),
      disallowed('You must be logged in to edit documents')
    );
  });

  it('allowed returns false on userCtx with null name', () => {
    assert.deepEqual(
      allowedOnServer({ name: null }, {}),
      disallowed('You must be logged in to edit documents')
    );
  });

  it('allowed returns true when userCtx has _admin role', () => {
    assert.isOk(allowedOnServer(userCtx({roles: [ '_admin' ]}, {})));
  });

  describe('type:user-settings', () => {

    it('succeeds if doc is valid', () => {
      assert.isOk(allowedOnClient(userCtx(), userSettings));
    });

    it('fails if no name is defined', () => {
      delete userSettings.name;
      assert.deepEqual(
        allowedOnClient(userCtx(), userSettings),
        disallowed('name property must be equivalent to username. e.g. "org.couchdb.user:sally"')
      );
    });

    it('_id prefix must be org.couchdb.user', () => {
      userSettings._id = 'org.couchdb.foo:sally';
      assert.deepEqual(
        allowedOnClient(userCtx(), userSettings),
        disallowed('_id must be prefixed with "org.couchdb.user:". e.g. "org.couchdb.user:sally"')
      );
    });

    it('_id must define a value after :', () => {
      userSettings._id = 'org.couchdb.user:';
      assert.deepEqual(
        allowedOnClient(userCtx(), userSettings),
        disallowed('_id must define a value after "org.couchdb.user:". e.g. "org.couchdb.user:sally"')
      );
    });

    it('name and username must match', () => {
      userSettings.name = 'foo';
      assert.deepEqual(
        allowedOnClient(userCtx(), userSettings),
        disallowed('name property must be equivalent to username. e.g. "org.couchdb.user:sally"')
      );
    });

    it('known must be boolean', () => {
      userSettings.known = 3;
      assert.deepEqual(
        allowedOnClient(userCtx(), userSettings),
        disallowed('known is not a boolean.')
      );
      userSettings.known = false;
      assert.isOk(allowedOnClient(userCtx(), userSettings));
    });

    it('roles must exist', () => {
      delete userSettings.roles;
      assert.deepEqual(
        allowedOnClient(userCtx(), userSettings),
        disallowed('roles is a required array')
      );
    });

  });

});
