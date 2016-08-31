var sinon = require('sinon'),
    db = require('../../../db'),
    utils = require('../utils'),
    migration = require('../../../migrations/extract-user-settings');

var ddoc = { id: '_design/_auth', key: '_design/_auth' };
var userA = {
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
var userB = {
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

exports.tearDown = function (callback) {
  utils.restore(db._users.list, db._users.insert, db.medic.insert, db.medic.get);
  callback();
};

exports['returns list errors'] = function(test) {
  test.expect(3);
  var list = sinon.stub(db._users, 'list').callsArgWith(1, 'boom');
  migration.run(function(err) {
    test.equals(err, 'boom');
    test.equals(list.callCount, 1);
    test.equals(list.args[0][0].include_docs, true);
    test.done();
  });
};

exports['does nothing if no users'] = function(test) {
  test.expect(2);
  var list = sinon.stub(db._users, 'list').callsArgWith(1, null, { rows: [] });
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(list.callCount, 1);
    test.done();
  });
};

exports['ignores users ddoc'] = function(test) {
  test.expect(2);
  var list = sinon.stub(db._users, 'list').callsArgWith(1, null, { rows: [ ddoc ] });
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(list.callCount, 1);
    test.done();
  });
};

exports['returns errors from insert'] = function(test) {
  test.expect(2);
  var list = sinon.stub(db._users, 'list').callsArgWith(1, null, { rows: [ ddoc, userA, userB ] });
  sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
  sinon.stub(db.medic, 'insert').callsArgWith(1, 'boom');
  migration.run(function(err) {
    test.equals(err, 'boom');
    test.equals(list.callCount, 1);
    test.done();
  });
};

exports['returns errors from update'] = function(test) {
  test.expect(1);
  sinon.stub(db._users, 'list').callsArgWith(1, null, { rows: [ ddoc, userA, userB ] });
  sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
  var medicInsert = sinon.stub(db.medic, 'insert');
  medicInsert
    .onFirstCall().callsArg(1)
    .onSecondCall().callsArg(1);
  sinon.stub(db._users, 'insert').callsArgWith(1, 'boom');

  migration.run(function(err) {
    test.equals(err, 'boom');
    test.done();
  });
};

exports['saves doc for settings'] = function(test) {
  test.expect(8);
  var list = sinon.stub(db._users, 'list')
    .callsArgWith(1, null, { rows: [ ddoc, userA, userB ] });
  // user-settings doesn't exist yet.
  sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
  var medicInsert = sinon.stub(db.medic, 'insert');
  medicInsert
    .onFirstCall().callsArg(1)
    .onSecondCall().callsArg(1);
  var userUpdate = sinon.stub(db._users, 'insert');
  userUpdate
    .onFirstCall().callsArg(1)
    .onSecondCall().callsArg(1);

  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(list.callCount, 1);

    test.equals(medicInsert.callCount, 2);
    test.same(medicInsert.args[0][0], {
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
    test.same(medicInsert.args[1][0], {
      _id: 'org.couchdb.user:b',
      name: 'b',
      type: 'user-settings',
      roles: [ 'district_admin' ]
    });

    test.equals(userUpdate.callCount, 2);
    test.same(userUpdate.args[0][0], {
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
    test.same(userUpdate.args[1][0], {
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
    test.done();
  });
};

exports['converts "known" field to boolean'] = function(test) {
  test.expect(1);
  // String value instead of boolean.
  userA.known = 'true';
  sinon.stub(db._users, 'list')
    .callsArgWith(1, null, { rows: [ ddoc, userA ] });
  // user-settings doesn't exist yet.
  sinon.stub(db.medic, 'get').callsArgWith(1, { error: 'not_found'});
  var medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);
  sinon.stub(db._users, 'insert').callsArg(1);

  migration.run(function() {
    test.equal(medicInsert.args[0][0].known, true);
    test.done();
  });
};

exports['skips and does not fail when user-settings already exists'] = function(test) {
  test.expect(7);
  var list = sinon.stub(db._users, 'list').callsArgWith(1, null, {
    rows: [ ddoc, userA, userB ]
  });
  var medicGet = sinon.stub(db.medic, 'get');
  medicGet
    // user-settings already exists for userA
    .onFirstCall().callsArgWith(1, null, { _id: userA.id })
    .onSecondCall().callsArgWith(1, { error: 'not_found' });
  var medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);
  var userUpdate = sinon.stub(db._users, 'insert').callsArg(1);
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(list.callCount, 1);
    test.equals(medicGet.callCount, 2);

    test.equals(medicInsert.callCount, 1);
    test.equals(medicInsert.args[0][0]._id, userB.id);

    test.equals(userUpdate.callCount, 1);
    test.equals(userUpdate.args[0][0]._id, userB.id);
    test.done();
  });
};

exports['lowercases _id and name fields'] = function(test) {
  test.expect(11);
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
  var medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);
  var userUpdate = sinon.stub(db._users, 'insert').callsArg(1);

  migration.run(function() {
    test.equal(medicInsert.callCount, 1);
    test.equal(medicInsert.args[0][0]._id, 'org.couchdb.user:aa');
    test.equal(medicInsert.args[0][0].name, 'aa');

    test.equal(userUpdate.callCount, 2);
    // inserted lowercase
    test.equal(userUpdate.args[0][0]._id, 'org.couchdb.user:aa');
    test.equal(userUpdate.args[0][0].name, 'aa');
    test.equal(userUpdate.args[0][0]._rev, null);
    // deleted uppercase
    test.equal(userUpdate.args[1][0]._id, 'org.couchdb.user:Aa');
    test.equal(userUpdate.args[1][0].name, 'Aa');
    test.equal(userUpdate.args[0][0]._rev, userA.doc._rev);
    test.equal(userUpdate.args[1][0]._deleted, true);

    test.done();
  });
};



