const request = require('request-promise-native');
const url = require('url');
const chai = require('chai');
const sinon = require('sinon');
const auth = require('../../src/auth');
const config = require('../../src/config');
const db = require('../../src/db');
const environment = require('../../src/environment');

let originalServerUrl;

describe('Auth', () => {

  beforeEach(() => {
    originalServerUrl = environment.serverUrl;
  });

  afterEach(() => {
    sinon.restore();
    environment.serverUrl = originalServerUrl;
  });

  describe('check', () => {

    it('returns error when not logged in', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').rejects({ statusCode: 401 });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err.message).to.equal('Not logged in');
        chai.expect(err.code).to.equal(401);
      });
    });

    it('returns error with incomplete session', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').resolves();
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err.message).to.equal('Failed to authenticate');
        chai.expect(err.code).to.equal(500);
      });
    });

    it('returns error when no user context', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').resolves({ roles: [] });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Failed to authenticate');
        chai.expect(err.code).to.equal(500);
      });
    });

    it('returns error when request errors', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').rejects({ error: 'boom' });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err).to.deep.equal({ error: 'boom' });
      });
    });

    it('returns error when it has insufficient privilege', () => {
      environment.serverUrl = 'http://abc.com';
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({ can_edit: ['abc'] });
      return auth.check({headers: []}, 'can_edit').catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Insufficient privileges');
        chai.expect(err.code).to.equal(403);
      });
    });

    it('returns username for admin', () => {
      environment.serverUrl = 'http://abc.com';
      const userCtx = { userCtx: { name: 'steve', roles: [ '_admin' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      return auth.check({headers: []}, 'can_edit').then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.name).to.equal('steve');
      });
    });

    it('returns username of non-admin user', () => {
      environment.serverUrl = 'http://abc.com';
      const userCtx = { userCtx: { name: 'laura', roles: [ 'xyz', 'district_admin' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({ can_edit: ['district_admin'] });
      return auth.check({headers: []}, 'can_edit').then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.name).to.equal('laura');
      });
    });

    it('accepts multiple required roles', () => {
      environment.serverUrl = 'http://abc.com';
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
      sinon.stub(url, 'format').returns('http://abc.com');
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({
        can_export_messages: ['district_admin'],
        can_export_contacts: ['district_admin'],
      });
      return auth.check({headers: []}, [ 'can_export_messages', 'can_export_contacts' ]).then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.name).to.equal('steve');
      });
    });

    it('checks all required roles', () => {
      environment.serverUrl = 'http://abc.com';
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
      sinon.stub(url, 'format').returns('http://abc.com');
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({
        can_export_messages: ['district_admin'],
        can_export_server_logs: ['national_admin'],
      });
      return auth.check({headers: []}, [ 'can_export_messages', 'can_export_server_logs' ]).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Insufficient privileges');
        chai.expect(err.code).to.equal(403);
      });
    });
  });

  describe('checkUrl', () => {

    it('requests the given url and returns status', () => {
      environment.serverUrl = 'http://abc.com';
      const format = sinon.stub(url, 'format').returns('http://abc.com');
      const head = sinon.stub(request, 'head').resolves({ statusCode: 444 });
      return auth.checkUrl({ params: { path: '/home/screen' } }).then(actual => {
        chai.expect(format.callCount).to.equal(1);
        chai.expect(format.args[0][0].pathname).to.equal('/home/screen');
        chai.expect(head.callCount).to.equal(1);
        chai.expect(head.args[0][0].url).to.equal('http://abc.com');
        chai.expect(actual).to.equal(444);
      });
    });

  });

  describe('hasOnlineRole', () => {
    it('should return false with bad params', () => {
      chai.expect(auth.hasOnlineRole()).to.equal(false);
      chai.expect(auth.hasOnlineRole(false)).to.equal(false);
      chai.expect(auth.hasOnlineRole(undefined)).to.equal(false);
      chai.expect(auth.hasOnlineRole('string')).to.equal(false);
      chai.expect(auth.hasOnlineRole({ ob: 'ject' })).to.equal(false);
      chai.expect(auth.hasOnlineRole([])).to.equal(false);
    });

    it('should return false when no online role was found', () => {
      const scenarios = [
        ['some_role'],
        ['one_role', 'district_manager', 'admin'],
        ['one_role', 'not_district_admin', 'not_admin'],
      ];
      scenarios.forEach(roles => {
        const message = `hasOnlineRole failed for ${roles}`;
        chai.expect(auth.hasOnlineRole(roles)).to.equal(false, message);
      });
    });

    it('should return true when online role is found', () => {
      const scenarios = [
        ['_admin'],
        ['_admin', 'other_role'],
        ['chw', '_admin'],
        ['not_chw', 'national_admin'],
        ['random', 'national_admin'],
        ['national_admin'],
        ['mm-online'],
        ['mm-online', 'other'],
        ['not-mm-online', 'mm-online'],
      ];
      scenarios.forEach(roles => {
        const message = `hasOnlineRole failed for ${roles}`;
        chai.expect(auth.hasOnlineRole(roles)).to.equal(true, message);
      });
    });
  });

  describe('isOnlineOnly', () => {

    it('checks for "admin" role', () => {
      chai.expect(auth.isOnlineOnly({ roles: ['_admin'] })).to.equal(true);
      chai.expect(auth.isOnlineOnly({ roles: ['_admin', 'some_role'] })).to.equal(true);
    });

    it('checks "national_admin" role', () => {
      chai.expect(auth.isOnlineOnly({ roles: ['national_admin'] })).to.equal(true);
      chai.expect(auth.isOnlineOnly({ roles: ['national_admin', 'chw'] })).to.equal(true);
    });

    it('should check for "mm-online" role', () => {
      chai.expect(auth.isOnlineOnly({ roles: ['mm-online'] })).to.equal(true);
      chai.expect(auth.isOnlineOnly({ roles: ['mm-online', 'offline'] })).to.equal(true);
    });

    it('should return false for non-admin roles', () => {
      sinon.stub(config, 'get');

      chai.expect(auth.isOnlineOnly({ roles: ['district_admin'] })).to.equal(false);
      chai.expect(auth.isOnlineOnly({ roles: ['roleA'] })).to.equal(false);
      chai.expect(auth.isOnlineOnly({ roles: ['roleA', 'roleB'] })).to.equal(false);
      chai.expect(auth.isOnlineOnly({ roles: ['roleA', 'roleB', 'roleC'] })).to.equal(false);
      chai.expect(auth.isOnlineOnly({ roles: ['roleB', 'roleC'] })).to.equal(false);
      chai.expect(auth.isOnlineOnly({ roles: ['roleB'] })).to.equal(false);

      chai.expect(config.get.callCount).to.equal(0);
    });

  });

  describe('isOffline', () => {
    it('should return true for an empty array and for roles that are not configured', () => {
      sinon.stub(config, 'get').withArgs('roles').returns({ roleA: { offline: true }, roleB: { offline: false }});
      chai.expect(auth.isOffline([])).to.equal(true);
      chai.expect(auth.isOffline(['random'])).to.equal(true);
      chai.expect(auth.isOffline(['role1', 'role2'])).to.equal(true);
    });

    it('should return true when at least one role is offline and no mm-online role', () => {
      sinon.stub(config, 'get').withArgs('roles').returns({ roleA: { offline: true }, roleB: { offline: false }});
      chai.expect(auth.isOffline(['roleA'])).to.equal(true);
      chai.expect(auth.isOffline(['roleA', 'random'])).to.equal(true);
      chai.expect(auth.isOffline(['roleA', 'roleB'])).to.equal(true);
      chai.expect(auth.isOffline(['roleA', 'roleB', 'random'])).to.equal(true);
    });

    it('should return false when none of the configured roles are offline', () => {
      sinon.stub(config, 'get').withArgs('roles').returns({ roleA: { offline: true }, roleB: { offline: false }});
      chai.expect(auth.isOffline(['roleB'])).to.equal(false);
      chai.expect(auth.isOffline(['roleB', 'roleC'])).to.equal(false);
    });
  });

  describe('getUserSettings', () => {

    it('returns medic user doc with facility from couchdb user doc', () => {
      environment.serverUrl = 'http://abc.com';
      sinon
        .stub(db.users, 'get')
        .resolves({ name: 'steve', facility_id: 'steveVille', roles: ['b'] });
      sinon
        .stub(db.medic, 'get')
        .resolves({ name: 'steve2', facility_id: 'otherville', contact_id: 'steve', roles: ['c'] });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: 'steveVille', key: 'steveVille', doc: { _id: 'steveVille', place_id: 'steve_ville', name: 'steve V' } },
          { id: 'steve', key: 'steve', doc: { _id: 'steve', patient_id: 'steve', name: 'steve' } },
        ],
      });

      return auth
        .getUserSettings({ name: 'steve' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            name: 'steve',
            facility_id: 'steveVille',
            contact_id: 'steve',
            roles: ['b'],
            facility: { _id: 'steveVille', place_id: 'steve_ville', name: 'steve V' },
            contact: { _id: 'steve', patient_id: 'steve', name: 'steve' },
          });

          chai.expect(db.users.get.callCount).to.equal(1);
          chai.expect(db.users.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
          chai.expect(db.medic.allDocs.callCount).to.equal(1);
          chai.expect(db.medic.allDocs.args[0]).to.deep.equal([{ keys: ['steveVille', 'steve'], include_docs: true }]);
        });
    });

    it('returns name and roles from provided userCtx', () => {
      environment.serverUrl = 'http://abc.com';

      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: 'myUserVille', key: 'myUserVille', doc: { _id: 'myUserVille', place_id: 'user_ville' } },
          { id: 'my-user-contact', key: 'my-user-contact', doc: { _id: 'my-user-contact', patient_id: 'contact' } },
        ],
      });

      return auth
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
            facility: { _id: 'myUserVille', place_id: 'user_ville' },
            contact: { _id: 'my-user-contact', patient_id: 'contact' },
          });
        });
    });

    it('should not use malformed results from all docs', () => {
      environment.serverUrl = 'http://abc.com';

      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [{ id: 'malformed' }],
      });

      return auth
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
          });
        });
    });

    it('should not use malformed results from all docs', () => {
      environment.serverUrl = 'http://abc.com';

      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({});

      return auth
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
          });
        });
    });

    it('should not use malformed results from all docs', () => {
      environment.serverUrl = 'http://abc.com';

      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({ rows: {} });

      return auth
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
          });
        });
    });

    it('should not use malformed results from all docs', () => {
      environment.serverUrl = 'http://abc.com';

      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({ rows: [ undefined, {} ] });

      return auth
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
          });
        });
    });

    it('should work with not found contact', () => {
      environment.serverUrl = 'http://abc.com';

      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').resolves({
        rows: [
          { id: 'myUserVille', key: 'myUserVille', doc: { _id: 'myUserVille' } },
          { key: 'my-user-contact', error: 'not_found' },
        ],
      });

      return auth
        .getUserSettings({ name: 'my-user' })
        .then(result => {
          chai.expect(result).to.deep.equal({
            _id: 'org.couchdb.user:my-user',
            name: 'my-user',
            roles: [ 'a' ],
            type: 'user-settings',
            some: 'field',
            contact_id: 'my-user-contact',
            facility_id: 'myUserVille',
            facility: { _id: 'myUserVille' },
            contact: undefined,
          });
        });
    });

    it('throws error if _users user returns an error', () => {
      environment.serverUrl = 'http://abc.com';
      sinon.stub(db.users, 'get').rejects({ some: 'err' });
      sinon.stub(db.medic, 'get').resolves({});
      return auth
        .getUserSettings({ name: 'steve' })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });

    it('throws error if medic user-settings returns an error', () => {
      environment.serverUrl = 'http://abc.com';
      sinon.stub(db.users, 'get').resolves({});
      sinon.stub(db.medic, 'get').rejects({ some: 'err' });
      return auth
        .getUserSettings({ name: 'steve' })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ some: 'err' });
        });
    });

    it('should throw an error if medic all docs returns an error', () => {
      environment.serverUrl = 'http://abc.com';

      sinon.stub(db.users, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user',
        roles: [ 'a' ],
        type: 'user',
        password_scheme: 'abcd',
        facility_id: 'myUserVille'
      });
      sinon.stub(db.medic, 'get').resolves({
        _id: 'org.couchdb.user:my-user',
        name: 'my-user-edited',
        roles: [ '_admin' ],
        type: 'user-settings',
        some: 'field',
        contact_id: 'my-user-contact',
        facility_id: 'otherVille'
      });
      sinon.stub(db.medic, 'allDocs').rejects({ error: 'boom' });

      return auth
        .getUserSettings({ name: 'steve' })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(err => {
          chai.expect(err).to.deep.equal({ error: 'boom' });
        });
    });
  });
});
