const request = require('request'),
      url = require('url'),
      chai = require('chai'),
      sinon = require('sinon').sandbox.create(),
      auth = require('../../src/auth'),
      config = require('../../src/config'),
      db = require('../../src/db-nano');

let originalDbSettings;

describe('Auth', () => {

  beforeEach(() => {
    originalDbSettings = db.settings;
  });

  afterEach(() => {
    sinon.restore();
    db.settings = originalDbSettings;
  });

  it('auth returns error when not logged in', done => {
    db.settings = {
      protocol: 'protocol',
      port: 'port',
      host: 'hostname',
      db: 'dbName',
      auditDb: 'auditDbName',
      ddoc: 'medic'
    };
    const format = sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get').callsArgWith(1, null, null);
    auth.check({ }, null, null, err => {
      chai.expect(format.callCount).to.equal(1);
      chai.expect(format.args[0][0].protocol).to.equal('protocol');
      chai.expect(format.args[0][0].hostname).to.equal('hostname');
      chai.expect(format.args[0][0].port).to.equal('port');
      chai.expect(format.args[0][0].pathname).to.equal('/_session');
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0].url).to.equal('http://abc.com');
      chai.expect(err.message).to.equal('Not logged in');
      chai.expect(err.code).to.equal(401);
      done();
    });
  });

  it('auth returns error when no user context', done => {
    const format = sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get').callsArgWith(1, null, null, { roles: [] });
    auth.check({ }, null, null, err => {
      chai.expect(format.callCount).to.equal(1);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(err.message).to.equal('Not logged in');
      chai.expect(err.code).to.equal(401);
      done();
    });
  });

  it('auth returns error when request errors', done => {
    const format = sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get').callsArgWith(1, 'boom');
    auth.check({ }, null, null, err => {
      chai.expect(format.callCount).to.equal(1);
      chai.expect(get.callCount).to.equal(1);
      chai.expect(get.args[0][0].url).to.equal('http://abc.com');
      chai.expect(err.message).to.equal('Not logged in');
      chai.expect(err.code).to.equal(401);
      done();
    });
  });

  it('auth returns error when no has insufficient privilege', done => {
    const district = '123';
    const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz' ] } };
    sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get').callsArgWith(1, null, null, userCtx);
    sinon.stub(config, 'get').returns([ { name: 'can_edit', roles: [ 'abc' ] } ]);
    auth.check({ }, 'can_edit', district, err => {
      chai.expect(get.callCount).to.equal(1);
      chai.expect(err.message).to.equal('Insufficient privileges');
      chai.expect(err.code).to.equal(403);
      done();
    });
  });

  it('auth returns username for admin', done => {
    const district = '123';
    const userCtx = { userCtx: { name: 'steve', roles: [ '_admin' ] } };
    sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get').callsArgWith(1, null, null, userCtx);
    auth.check({ }, 'can_edit', district, (err, ctx) => {
      chai.expect(get.callCount).to.equal(1);
      chai.expect(err).to.equal(null);
      chai.expect(ctx.user).to.equal('steve');
      chai.expect(ctx.district).to.equal(undefined);
      done();
    });
  });

  it('auth returns username and district', done => {
    const district = '123';
    const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
    const format = sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get');
    get.onFirstCall().callsArgWith(1, null, null, userCtx);
    get.onSecondCall().callsArgWith(1, null, null, { facility_id: district });
    sinon.stub(config, 'get').returns([ { name: 'can_edit', roles: [ 'district_admin' ] } ]);
    auth.check({ }, 'can_edit', district, (err, ctx) => {
      chai.expect(format.callCount).to.equal(2);
      chai.expect(format.args[1][0].pathname).to.equal('/_users/org.couchdb.user:steve');
      chai.expect(get.callCount).to.equal(2);
      chai.expect(err).to.equal(null);
      chai.expect(ctx.user).to.equal('steve');
      chai.expect(ctx.district).to.equal(district);
      done();
    });
  });

  it('auth returns error when requesting unallowed facility', done => {
    const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
    sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get');
    get.onFirstCall().callsArgWith(1, null, null, userCtx);
    get.onSecondCall().callsArgWith(1, null, null, { facility_id: '123' });
    sinon.stub(config, 'get').returns([ { name: 'can_edit', roles: [ 'district_admin' ] } ]);
    auth.check({ }, 'can_edit', '789', err => {
      chai.expect(get.callCount).to.equal(2);
      chai.expect(err.message).to.equal('Insufficient privileges');
      chai.expect(err.code).to.equal(403);
      done();
    });
  });

  it('auth accepts multiple required roles', done => {
    const district = '123';
    const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
    sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get');
    get.onFirstCall().callsArgWith(1, null, null, userCtx);
    get.onSecondCall().callsArgWith(1, null, null, { facility_id: district });
    sinon.stub(config, 'get').returns([
      { name: 'can_export_messages', roles: [ 'district_admin' ] },
      { name: 'can_export_contacts', roles: [ 'district_admin' ] }
    ]);
    auth.check({ }, [ 'can_export_messages', 'can_export_contacts' ], district, (err, ctx) => {
      chai.expect(get.callCount).to.equal(2);
      chai.expect(err).to.equal(null);
      chai.expect(ctx.user).to.equal('steve');
      chai.expect(ctx.district).to.equal(district);
      done();
    });
  });

  it('auth checks all required roles', done => {
    const district = '123';
    const userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
    sinon.stub(url, 'format').returns('http://abc.com');
    const get = sinon.stub(request, 'get').callsArgWith(1, null, null, userCtx);
    sinon.stub(config, 'get').returns([
      { name: 'can_export_messages', roles: [ 'district_admin' ] },
      { name: 'can_export_server_logs', roles: [ 'national_admin' ] }
    ]);
    auth.check({ }, [ 'can_export_messages', 'can_export_server_logs' ], district, err => {
      chai.expect(get.callCount).to.equal(1);
      chai.expect(err.message).to.equal('Insufficient privileges');
      chai.expect(err.code).to.equal(403);
      done();
    });
  });

  it('checkUrl requests the given url and returns status', done => {
    const format = sinon.stub(url, 'format').returns('http://abc.com');
    const head = sinon.stub(request, 'head').callsArgWith(1, null, { statusCode: 444 });
    auth.checkUrl({ params: { path: '/home/screen' } }, (err, output) => {
      chai.expect(err).to.equal(null);
      chai.expect(format.callCount).to.equal(1);
      chai.expect(format.args[0][0].pathname).to.equal('/home/screen');
      chai.expect(head.callCount).to.equal(1);
      chai.expect(head.args[0][0].url).to.equal('http://abc.com');
      chai.expect(output.status).to.equal(444);
      done();
    });
  });

  it('isOnlineOnly checks for "admin" and "national_admin" roles', done => {
    chai.expect(auth.isOnlineOnly({ roles: ['_admin'] })).to.equal(true);
    chai.expect(auth.isOnlineOnly({ roles: ['national_admin'] })).to.equal(true);
    chai.expect(auth.isOnlineOnly({ roles: ['mm-online'] })).to.equal(true);
    chai.expect(auth.isOnlineOnly({ roles: ['district_admin'] })).to.equal(false);
    done();
  });

  it('getUserSettings returns couchdb user doc, with callback', done => {
    sinon.stub(db.medic, 'get').callsArgWith(1, null, { name: 'steve', facility_id: 'steveVille' });
    auth.getUserSettings({ name: 'steve' }, (err, result) => {
      chai.expect(err).to.equal(null);
      chai.expect(result).to.deep.equal({ name: 'steve', facility_id: 'steveVille' });
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
      done();
    });
  });

  it('getUserSettings returns couchdb user doc, with promise', () => {
    sinon.stub(db.medic, 'get').callsArgWith(1, null, { name: 'steve', facility_id: 'steveVille' });
    auth.getUserSettings({ name: 'steve' }).then((err, result) => {
      chai.expect(err).to.equal(null);
      chai.expect(result).to.deep.equal({ name: 'steve', facility_id: 'steveVille' });
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.get.withArgs('org.couchdb.user:steve').callCount).to.equal(1);
    });
  });

  it('getUserSettings throws error if user cannot be read', () => {
    sinon.stub(db.medic, 'get').callsArgWith(1, 'someErr');
    auth.getUserSettings({ name: 'steve' }).then((err, result) => {
      chai.expect(err).to.equal('someErr');
      chai.expect(result).to.equal(undefined);
    });
  });
});
