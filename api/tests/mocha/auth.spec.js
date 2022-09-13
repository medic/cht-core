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

    it('returns error when no has insufficient privilege', () => {
      environment.serverUrl = 'http://abc.com';
      const district = '123';
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({ can_edit: ['abc'] });
      return auth.check({headers: []}, 'can_edit', district).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Insufficient privileges');
        chai.expect(err.code).to.equal(403);
      });
    });

    it('returns username for admin', () => {
      environment.serverUrl = 'http://abc.com';
      const district = '123';
      const userCtx = { userCtx: { name: 'steve', roles: [ '_admin' ] } };
      const get = sinon.stub(request, 'get').resolves(userCtx);
      return auth.check({headers: []}, 'can_edit', district).then(ctx => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(ctx.user).to.equal('steve');
        chai.expect(ctx.district).to.equal(undefined);
      });
    });

    it('returns username and district', () => {
      environment.serverUrl = 'http://abc.com';
      const district = '123';
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
      const get = sinon.stub(request, 'get');
      get.onFirstCall().resolves(userCtx);
      get.onSecondCall().resolves({ facility_id: district });
      sinon.stub(config, 'get').returns({ can_edit: ['district_admin'] });
      return auth.check({headers: []}, 'can_edit', district).then(ctx => {
        chai.expect(get.callCount).to.equal(2);
        chai.expect(ctx.user).to.equal('steve');
        chai.expect(ctx.district).to.equal(district);
      });
    });

    it('returns error when requesting unallowed facility', () => {
      environment.serverUrl = 'http://abc.com';
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
      sinon.stub(url, 'format').returns('http://abc.com');
      const get = sinon.stub(request, 'get');
      get.onFirstCall().resolves(userCtx);
      get.onSecondCall().resolves({ facility_id: '123' });
      sinon.stub(config, 'get').returns({ can_edit: ['district_admin'] });
      return auth.check({headers: []}, 'can_edit', '789').catch(err => {
        chai.expect(get.callCount).to.equal(2);
        chai.expect(err.message).to.equal('Insufficient privileges');
        chai.expect(err.code).to.equal(403);
      });
    });

    it('accepts multiple required roles', () => {
      environment.serverUrl = 'http://abc.com';
      const district = '123';
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
      sinon.stub(url, 'format').returns('http://abc.com');
      const get = sinon.stub(request, 'get');
      get.onFirstCall().resolves(userCtx);
      get.onSecondCall().resolves({ facility_id: district });
      sinon.stub(config, 'get').returns({
        can_export_messages: ['district_admin'],
        can_export_contacts: ['district_admin'],
      });
      return auth.check({headers: []}, [ 'can_export_messages', 'can_export_contacts' ], district).then(ctx => {
        chai.expect(get.callCount).to.equal(2);
        chai.expect(ctx.user).to.equal('steve');
        chai.expect(ctx.district).to.equal(district);
      });
    });

    it('checks all required roles', () => {
      environment.serverUrl = 'http://abc.com';
      const district = '123';
      const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
      sinon.stub(url, 'format').returns('http://abc.com');
      const get = sinon.stub(request, 'get').resolves(userCtx);
      sinon.stub(config, 'get').returns({
        can_export_messages: ['district_admin'],
        can_export_server_logs: ['national_admin'],
      });
      return auth.check({headers: []}, [ 'can_export_messages', 'can_export_server_logs' ], district).catch(err => {
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
