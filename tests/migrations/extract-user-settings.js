var sinon = require('sinon'),
    db = require('../../db'),
    utils = require('../utils'),
    migration = require('../../migrations/extract-user-settings');

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
    known: 'true',
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
  utils.restore(db._users.list, db._users.insert, db.medic.insert);
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
  var medicInsert = sinon.stub(db.medic, 'insert');
  medicInsert
    .onFirstCall().callsArgWith(1)
    .onSecondCall().callsArgWith(1);
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
  var medicInsert = sinon.stub(db.medic, 'insert');
  medicInsert
    .onFirstCall().callsArgWith(1)
    .onSecondCall().callsArgWith(1);
  var userUpdate = sinon.stub(db._users, 'insert');
  userUpdate
    .onFirstCall().callsArgWith(1)
    .onSecondCall().callsArgWith(1);

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
      known: 'true',
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
