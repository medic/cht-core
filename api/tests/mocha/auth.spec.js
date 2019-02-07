const request = require('request-promise-native'),
      url = require('url'),
      chai = require('chai'),
      sinon = require('sinon'),
      auth = require('../../src/auth'),
      config = require('../../src/config'),
      db = require('../../src/db'),
      environment = require('../../src/environment');

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
      const get = sinon.stub(request, 'get').resolves();
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err.message).to.equal('Not logged in');
        chai.expect(err.code).to.equal(401);
      });
    });

    it('returns error when no user context', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').resolves({ roles: [] });
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(err.message).to.equal('Not logged in');
        chai.expect(err.code).to.equal(401);
      });
    });

    it('returns error when request errors', () => {
      environment.serverUrl = 'http://abc.com';
      const get = sinon.stub(request, 'get').rejects('boom');
      return auth.check({ }).catch(err => {
        chai.expect(get.callCount).to.equal(1);
        chai.expect(get.args[0][0].url).to.equal('http://abc.com/_session');
        chai.expect(err.message).to.equal('Not logged in');
        chai.expect(err.code).to.equal(401);
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

  describe('isOnlineOnly', () => {

    it('checks for "admin" role', () => {
      chai.expect(auth.isOnlineOnly({ roles: ['_admin'] })).to.equal(true);
    });

    it('checks "national_admin" role', () => {
      chai.expect(auth.isOnlineOnly({ roles: ['national_admin'] })).to.equal(true);
    });

    it('checks for "mm-online" role', () => {
      chai.expect(auth.isOnlineOnly({ roles: ['mm-online'] })).to.equal(true);
    });

    it('checks for "admin" and "national_admin" roles', () => {
      chai.expect(auth.isOnlineOnly({ roles: ['district_admin'] })).to.equal(false);
    });

  });

  describe('getUserSettings', () => {

    it('returns medic user doc with facility_id from couchdb user doc', () => {
      environment.serverUrl = 'http://abc.com';
      sinon
        .stub(db.users, 'get')
        .resolves({ name: 'steve', facility_id: 'steveVille', roles: ['b'] });
      sinon
        .stub(db.medic, 'get')
        .resolves({ name: 'steve2', facility_id: 'otherville', contact_id: 'steve', roles: ['c'] });
      return auth.getUserSettings({ name: 'steve' }).then(result => {
        chai.expect(result).to.deep.equal(
          { name: 'steve', facility_id: 'steveVille', contact_id: 'steve', roles: ['b'] });
        chai.expect(db.users.get.callCount).to.equal(1);
        chai.expect(db.users.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
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

      return auth.getUserSettings({ name: 'my-user' }).then(result => {
        chai.expect(result).to.deep.equal({
          _id: 'org.couchdb.user:my-user',
          name: 'my-user',
          roles: [ 'a' ],
          type: 'user-settings',
          some: 'field',
          contact_id: 'my-user-contact',
          facility_id: 'myUserVille'
        });
      });
    });

    it('throws error if _users user returns an error', () => {
      environment.serverUrl = 'http://abc.com';
      sinon.stub(db.users, 'get').rejects({ some: 'err' });
      sinon.stub(db.medic, 'get').resolves({});
      return auth.getUserSettings({ name: 'steve' }).catch(err => {
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

    it('throws error if medic user-settings returns an error', () => {
      environment.serverUrl = 'http://abc.com';
      sinon.stub(db.users, 'get').resolves({});
      sinon.stub(db.medic, 'get').rejects({ some: 'err' });
      return auth.getUserSettings({ name: 'steve' }).catch(err => {
        chai.expect(err).to.deep.equal({ some: 'err' });
      });
    });

  });
});
