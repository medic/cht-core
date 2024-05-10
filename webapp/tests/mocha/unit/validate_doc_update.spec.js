const _ = require('lodash');
const fs = require('fs');
const assert = require('chai').assert;

describe('validate doc update', () => {

  const wrapValidateDocUpdate = (file) => eval(`log = console.log; (${fs.readFileSync(__dirname + file)})`);
  const serverFn = wrapValidateDocUpdate('/../../../../ddocs/medic-db/medic/validate_doc_update.js');
  const clientFn = wrapValidateDocUpdate('/../../../../ddocs/medic-db/medic-client/validate_doc_update.js');

  // A valid user-settings doc. Does not require type property because that is
  // already matched before passing to the validation function.
  const getUserSettings = () => {
    return {
      _id: 'org.couchdb.user:sally',
      name: 'sally',
      type: 'user-settings',
      roles: []
    };
  }

  const userCtx = (additions) => {
    additions = additions || {};
    return _.defaults(additions, { name: 'a-user' });
  };

  const allowed = (fn, userCtx, newDoc, oldDoc, secObj={}) => {
    oldDoc = oldDoc || newDoc;
    try {
      fn(newDoc, oldDoc, userCtx, secObj);
    } catch(err) {
      if (err.forbidden) {
        throw new Error(`Expected pass but got: "${err.forbidden}"`);
      }
      throw err;
    }
  };

  const forbidden = (fn, msg, userCtx, newDoc, oldDoc, secObj={}) => {
    oldDoc = oldDoc || newDoc;
    try {
      fn(newDoc, oldDoc, userCtx, secObj);
      assert.fail('expected error to be thrown');
    } catch(err) {
      assert.equal(msg, err.forbidden);
    }
  };

  const allowedOnServer = (userCtx, newDoc, oldDoc, secObj) => allowed(serverFn, userCtx, newDoc, oldDoc, secObj);
  const allowedOnClient = (userCtx, newDoc, oldDoc, secObj) => allowed(clientFn, userCtx, newDoc, oldDoc, secObj);
  const forbiddenOnServer = (msg, userCtx, newDoc, oldDoc, secObj) => forbidden(serverFn, msg, userCtx, newDoc, oldDoc, secObj);
  const forbiddenOnClient = (msg, userCtx, newDoc, oldDoc, secObj) => forbidden(clientFn, msg, userCtx, newDoc, oldDoc, secObj);

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
        allowedOnServer(userCtx({ roles: [ '_admin' ] }), doc);
        forbiddenOnServer('You are not authorized to edit admin only docs', userCtx({ roles: [ 'national_admin' ] }), doc);
        forbiddenOnServer('You are not authorized to edit admin only docs', userCtx({ roles: [ 'test' ] }), doc);
      });
    });
  });

  it('only db admins are allowed change their own place', () => {
    const doc = { _id: 'abc', type: 'clinic' };
    allowedOnServer(userCtx({ roles: [ '_admin' ], facility_id: 'abc' }), doc);
    allowedOnServer(userCtx({ roles: [ 'national_admin' ], facility_id: 'abc' }), doc, doc, { admins: { roles: [ 'national_admin' ] } });
    allowedOnClient(userCtx({ roles: [ 'national_admin' ], facility_id: 'abc' }), doc, doc, { admins: { roles: [ 'national_admin' ] } });
    forbiddenOnClient('You are not authorized to edit your own place', userCtx({roles: [ 'district_admin' ], facility_id: 'abc' }), doc);
  });

  it('allowed returns false on empty userCtx', () => {
    forbiddenOnServer('You must be logged in to edit documents', {}, {});
  });

  it('allowed returns false on userCtx with null name', () => {
    forbiddenOnServer('You must be logged in to edit documents', { name: null }, {});
  });

  it('allowed returns true when userCtx has _admin role', () => {
    allowedOnServer(userCtx({roles: [ '_admin' ]}), {});
  });

  describe('type:user-settings', () => {

    it('succeeds if doc is valid', () => {
      allowedOnClient(userCtx(), getUserSettings());
    });

    it('fails if no name is defined', () => {
      const userSettings = getUserSettings();
      delete userSettings.name;
      forbiddenOnClient('name property must be equivalent to username. e.g. "org.couchdb.user:sally"', userCtx(), userSettings);
    });

    it('_id prefix must be org.couchdb.user', () => {
      const userSettings = getUserSettings();
      userSettings._id = 'org.couchdb.foo:sally';
      forbiddenOnClient('_id must be prefixed with "org.couchdb.user:". e.g. "org.couchdb.user:sally"', userCtx(), userSettings);
    });

    it('_id must define a value after :', () => {
      const userSettings = getUserSettings();
      userSettings._id = 'org.couchdb.user:';
      forbiddenOnClient('_id must define a value after "org.couchdb.user:". e.g. "org.couchdb.user:sally"', userCtx(), userSettings);
    });

    it('name and username must match', () => {
      const userSettings = getUserSettings();
      userSettings.name = 'foo';
      forbiddenOnClient('name property must be equivalent to username. e.g. "org.couchdb.user:sally"', userCtx(), userSettings);
    });

    it('known must be boolean', () => {
      const userSettings = getUserSettings();
      userSettings.known = 3;
      forbiddenOnClient('known is not a boolean.', userCtx(), userSettings);
      userSettings.known = false;
      allowedOnClient(userCtx(), userSettings);
    });

    it('roles must exist', () => {
      const userSettings = getUserSettings();
      delete userSettings.roles;
      forbiddenOnClient('roles is a required array', userCtx(), userSettings);
    });

    it('does not allow non-admins to change roles', () => {
      const oldUserSettings = getUserSettings();
      const newUserSettings = getUserSettings();
      newUserSettings.roles.push('SUPER_ADMIN');
      forbiddenOnClient('You are not authorized to edit roles', userCtx(), newUserSettings, oldUserSettings);
    });

    it('allows admins to change roles', () => {
      const oldUserSettings = getUserSettings();
      const newUserSettings = getUserSettings();
      newUserSettings.roles.push('SUPER_ADMIN');
      const adminUserCtx = userCtx({ roles: [ '_admin' ] });
      allowedOnClient(adminUserCtx, newUserSettings, oldUserSettings);
    });

  });

});

// allowed:
// - privacy_policy_acceptance_log
// - known
