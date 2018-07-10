const sinon = require('sinon'),
      chai = require('chai'),
      db = require('../../../src/db-nano'),
      migration = require('../../../src/migrations/extract-user-settings');

const ddoc = { id: '_design/_auth', key: '_design/_auth' };
const userA = {
  id: 'org.couchdb.user:a',
  key: 'org.couchdb.user:a',
  doc: {
    _id: 'org.couchdb.user:a',
    _rev: '2',
    name: 'a',
    fullname: 'Mr A',
    email: 'a@b.com',
    phone: '0211111111',
    language: 'en',
    facility_id: 'd012fe8f511c536273ab13e4d3025d2d',
    salt: 'NaCl',
    derived_key: 'derived1',
    password_scheme: 'pbkdf2',
    iterations: 10,
    known: true,
    type: 'user',
    roles: []
  }
};
const userB = {
  id: 'org.couchdb.user:b',
  key: 'org.couchdb.user:b',
  doc: {
    _id: 'org.couchdb.user:b',
    _rev: '1',
    name: 'b',
    salt: 'base',
    derived_key: 'derived2',
    password_scheme: 'pbkdf2',
    iterations: 10,
    type: 'user',
    roles: [ 'district_admin' ]
  }
};

describe('extract-user-settings migration', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('returns list errors', done => {
    const list = sinon.stub(db._users, 'list').callsArgWith(1, 'boom');
    migration.run(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(list.callCount).to.equal(1);
      chai.expect(list.args[0][0].include_docs).to.equal(true);
      done();
    });
  });

  it('does nothing if no users', done => {
    const list = sinon.stub(db._users, 'list').callsArgWith(1, null, { rows: [] });
    migration.run(err => {
      chai.expect(list.callCount).to.equal(1);
      done(err);
    });
  });

  it('ignores users ddoc', done => {
    const list = sinon.stub(db._users, 'list').callsArgWith(1, null, { rows: [ ddoc ] });
    migration.run(err => {
      chai.expect(list.callCount).to.equal(1);
      done(err);
    });
  });

  it('returns errors from insert', done => {
    const list = sinon.stub(db._users, 'list').callsArgWith(1, null, { rows: [ ddoc, userA, userB ] });
    sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
    sinon.stub(db.medic, 'insert').callsArgWith(1, 'boom');
    migration.run(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(list.callCount).to.equal(1);
      done();
    });
  });

  it('returns errors from update', done => {
    sinon.stub(db._users, 'list').callsArgWith(1, null, { rows: [ ddoc, userA, userB ] });
    sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
    const medicInsert = sinon.stub(db.medic, 'insert');
    medicInsert
      .onFirstCall().callsArg(1)
      .onSecondCall().callsArg(1);
    sinon.stub(db._users, 'insert').callsArgWith(1, 'boom');

    migration.run(err => {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('saves doc for settings', done => {
    const list = sinon.stub(db._users, 'list')
      .callsArgWith(1, null, { rows: [ ddoc, userA, userB ] });
    // user-settings doesn't exist yet.
    sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
    const medicInsert = sinon.stub(db.medic, 'insert');
    medicInsert
      .onFirstCall().callsArg(1)
      .onSecondCall().callsArg(1);
    const userUpdate = sinon.stub(db._users, 'insert');
    userUpdate
      .onFirstCall().callsArg(1)
      .onSecondCall().callsArg(1);

    migration.run(err => {
      chai.expect(list.callCount).to.equal(1);

      chai.expect(medicInsert.callCount).to.equal(2);
      chai.expect(medicInsert.args[0][0]).to.deep.equal({
        _id: 'org.couchdb.user:a',
        name: 'a',
        fullname: 'Mr A',
        email: 'a@b.com',
        phone: '0211111111',
        language: 'en',
        known: true,
        type: 'user-settings',
        facility_id: 'd012fe8f511c536273ab13e4d3025d2d',
        roles: []
      });
      chai.expect(medicInsert.args[1][0]).to.deep.equal({
        _id: 'org.couchdb.user:b',
        name: 'b',
        type: 'user-settings',
        roles: [ 'district_admin' ]
      });

      chai.expect(userUpdate.callCount).to.equal(2);
      chai.expect(userUpdate.args[0][0]).to.deep.equal({
        _id: 'org.couchdb.user:a',
        _rev: '2',
        name: 'a',
        facility_id: 'd012fe8f511c536273ab13e4d3025d2d',
        salt: 'NaCl',
        derived_key: 'derived1',
        password_scheme: 'pbkdf2',
        iterations: 10,
        type: 'user',
        roles: []
      });
      chai.expect(userUpdate.args[1][0]).to.deep.equal({
        _id: 'org.couchdb.user:b',
        _rev: '1',
        name: 'b',
        salt: 'base',
        derived_key: 'derived2',
        password_scheme: 'pbkdf2',
        iterations: 10,
        type: 'user',
        roles: [ 'district_admin' ]
      });
      done(err);
    });
  });

  it('converts "known" field to boolean', done => {
    // String value instead of boolean.
    userA.known = 'true';
    sinon.stub(db._users, 'list')
      .callsArgWith(1, null, { rows: [ ddoc, userA ] });
    // user-settings doesn't exist yet.
    sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
    const medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);
    sinon.stub(db._users, 'insert').callsArg(1);

    migration.run(() => {
      chai.expect(medicInsert.args[0][0].known).to.equal(true);
      done();
    });
  });

  it('skips and does not fail when user-settings already exists', done => {
    const list = sinon.stub(db._users, 'list').callsArgWith(1, null, {
      rows: [ ddoc, userA, userB ]
    });
    const medicGet = sinon.stub(db.medic, 'get');
    medicGet
      // user-settings already exists for userA
      .onFirstCall().callsArgWith(1, null, { _id: userA.id })
      .onSecondCall().callsArgWith(1, { error: 'not_found' });
    const medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);
    const userUpdate = sinon.stub(db._users, 'insert').callsArg(1);
    migration.run(err => {
      chai.expect(list.callCount).to.equal(1);
      chai.expect(medicGet.callCount).to.equal(2);

      chai.expect(medicInsert.callCount).to.equal(1);
      chai.expect(medicInsert.args[0][0]._id).to.equal(userB.id);

      chai.expect(userUpdate.callCount).to.equal(1);
      chai.expect(userUpdate.args[0][0]._id).to.equal(userB.id);
      done(err);
    });
  });

  it('lowercases _id and name fields', done => {
    userA.id = 'org.couchdb.user:Aa';
    userA.key = 'org.couchdb.user:Aa';
    userA.doc._id = 'org.couchdb.user:Aa';
    userA.doc.name = 'Aa';

    sinon.stub(db._users, 'list')
      .callsArgWith(1, null, { rows: [ ddoc, userA ] });
    // user-settings doesn't exist yet.
    sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
    // _users doesn't exist yet.
    sinon.stub(db._users, 'get').callsArgWith(1, { error: 'not_found'});
    const medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);
    const userUpdate = sinon.stub(db._users, 'insert').callsArg(1);

    migration.run(() => {
      chai.expect(medicInsert.callCount).to.equal(1);
      chai.expect(medicInsert.args[0][0]._id).to.equal('org.couchdb.user:aa');
      chai.expect(medicInsert.args[0][0].name).to.equal('aa');

      chai.expect(userUpdate.callCount).to.equal(2);
      // inserted lowercase
      chai.expect(userUpdate.args[0][0]._id).to.equal('org.couchdb.user:aa');
      chai.expect(userUpdate.args[0][0].name).to.equal('aa');
      chai.expect(userUpdate.args[0][0]._rev).to.equal(undefined);
      // deleted uppercase
      chai.expect(userUpdate.args[1][0]._id).to.equal('org.couchdb.user:Aa');
      chai.expect(userUpdate.args[1][0].name).to.equal('Aa');
      chai.expect(userUpdate.args[0][0]._rev).to.equal(userA.doc._rev);
      chai.expect(userUpdate.args[1][0]._deleted).to.equal(true);

      done();
    });
  });

});
