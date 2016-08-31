var controller = require('../../../controllers/users'),
    people = require('../../../controllers/people'),
    places = require('../../../controllers/places'),
    db = require('../../../db'),
    utils = require('../utils'),
    sinon = require('sinon');

var facilitya = { _id: 'a', name: 'aaron' },
    facilityb = { _id: 'b', name: 'brian' },
    facilityc = { _id: 'c', name: 'cathy' };

var userData;

exports.tearDown = function (callback) {
  utils.restore(
    db.request,
    db.getPath,
    db.medic,
    db.medic.get,
    db.medic.insert,
    db.medic.view,
    db._users.get,
    db._users.insert,
    controller._mapUsers,
    controller._createContact,
    controller._createPlace,
    controller._createUser,
    controller._createUserSettings,
    controller._getAdmins,
    controller._getAllUsers,
    controller._getAllUserSettings,
    controller._getFacilities,
    controller._setContactParent,
    controller._validateUser,
    controller._validateUserSettings,
    controller._hasParent,
    controller._updateAdminPassword,
    controller._updatePlace,
    controller._updateUser,
    controller._updateUserSettings,
    controller._validateNewUsername,
    controller.getList,
    people.createPerson,
    people.getOrCreatePerson,
    places.getOrCreatePlace,
    places.getPlace
  );
  callback();
};

exports.setUp = function(callback) {
  sinon.stub(controller, '_getFacilities').callsArgWith(0, null, [
    facilitya,
    facilityb,
    facilityc,
  ]);
  userData = {
    username: 'x',
    password: 'x',
    place: { name: 'x' },
    contact: { 'parent': 'x' }
  };

  //sinon.stub(controller, '_getAdmins').callsArgWith(0, null, {
  //  gareth: 'abc'
  //});
  callback();
};

exports['getSettingsUpdates sets type property'] = function(test) {
  var settings = controller._getSettingsUpdates('john', {});
  test.equal(settings.type, 'user-settings');
  test.done();
};

exports['getSettingsUpdates removes user doc specific fields'] = function(test) {
  var data = {
    name: 'john',
    email: 'john@gmail.com',
    password: 'foo',
    roles: ['foo'],
    starsign: 'libra'
  };
  var settings = controller._getSettingsUpdates('john', data);
  test.ok(!settings.password);
  test.ok(!settings.roles);
  test.done();
};

exports['getSettingsUpdates reassigns place and contact fields'] = function(test) {
  var data = {
    place: 'abc',
    contact: '123',
    fullname: 'John'
  };
  var settings = controller._getSettingsUpdates('john', data);
  test.equals(settings.place, void 0);
  test.equals(settings.contact, void 0);
  test.equals(settings.contact_id, '123');
  test.equals(settings.facility_id, 'abc');
  test.equal(settings.fullname, 'John');
  test.done();
};

exports['getSettingsUpdates supports external_id field'] = function(test) {
  var data = {
    fullname: 'John',
    external_id: 'CHP020'
  };
  var settings = controller._getSettingsUpdates('john', data);
  test.equals(settings.external_id, 'CHP020');
  test.equal(settings.fullname, 'John');
  test.done();
};

exports['getUserUpdates enforces name field based on id'] = function(test) {
  var data = {
    name: 'sam',
    email: 'john@gmail.com'
  };
  var user = controller._getUserUpdates('john', data);
  test.equal(user.name , 'john');
  test.done();
};

exports['getUserUpdates reassigns place field'] = function(test) {
  var data = {
    place: 'abc'
  };
  var user = controller._getUserUpdates('john', data);
  test.equals(user.place, void 0);
  test.equals(user.facility_id, 'abc');
  test.done();
};

exports['getType returns unknown when roles is empty'] = function(test) {
  var user = {
    name: 'sam',
    roles: []
  };
  var admins = {};
  test.equal(controller._getType(user, admins), 'unknown');
  test.done();
};

exports['getType returns admin when user is in admins list and roles is empty'] = function(test) {
  var user = {
    name: 'sam',
    roles: []
  };
  var admins = {
    'sam': 'x'
  };
  test.equal(controller._getType(user, admins), 'admin');
  test.done();
};

exports['describe hasParent'] = function(test) {
  var facility = {
    _id: 'foo',
    color: 'red',
    parent: {
      _id: 'bar',
      color: 'green',
      parent: {
        _id: 'baz',
        color: 'blue'
      }
    }
  };
  test.ok(controller._hasParent(facility, 'baz'));
  test.ok(!controller._hasParent(facility, 'slime'));
  test.ok(controller._hasParent(facility, 'bar'));
  test.ok(controller._hasParent(facility, 'foo'));
  test.ok(!controller._hasParent(facility, 'goo'));
  // does not modify facility object
  test.deepEqual(facility, {
    _id: 'foo',
    color: 'red',
    parent: {
      _id: 'bar',
      color: 'green',
      parent: {
        _id: 'baz',
        color: 'blue'
      }
    }
  });
  test.done();
};

exports['validateUser defines custom error when not found.'] = function(test) {
  sinon.stub(db._users, 'get').callsArgWith(1, {statusCode: 404});
  controller._validateUser('x', function(err) {
    test.equal(err.message, 'Failed to find user.');
    test.done();
  });
};

exports['validateUserSettings defines custom error when not found.'] = function(test) {
  sinon.stub(db.medic, 'get').callsArgWith(1, {statusCode: 404});
  controller._validateUserSettings('x', function(err) {
    test.equal(err.message, 'Failed to find user settings.');
    test.done();
  });
};

exports['getType returns role when user is in admins list and has role'] = function(test) {
  var user = {
    name: 'sam',
    roles: ['driver']
  };
  var admins = {
    'sam': 'x'
  };
  test.equal(controller._getType(user, admins), 'driver');
  test.done();
};

exports['getList collects user infos'] = function(test) {
  sinon.stub(controller, '_getAdmins').callsArg(0);
  sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
    {
      id: 'org.couchdb.user:x',
      doc: {
        name: 'lucas',
        facility_id: 'c',
        roles: [ 'national-admin', 'data-entry' ]
      }
    },
    {
      id: 'org.couchdb.user:y',
      doc: {
        name: 'milan',
        facility_id: 'b',
        roles: [ 'district-admin' ]
      }
    }
  ]);
  sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, [
    {
      _id: 'org.couchdb.user:x',
      name: 'lucas',
      fullname: 'Lucas M',
      email: 'l@m.com',
      phone: '123456789'
    },
    {
      _id: 'org.couchdb.user:y',
      name: 'milan',
      fullname: 'Milan A',
      email: 'm@a.com',
      phone: '987654321',
      external_id: 'LTT093'
    }
  ]);
  controller.getList(function(err, data) {
    test.equals(err, null);
    test.equals(data.length, 2);
    var lucas = data[0];
    test.equals(lucas.id, 'org.couchdb.user:x');
    test.equals(lucas.username, 'lucas');
    test.equals(lucas.fullname, 'Lucas M');
    test.equals(lucas.email, 'l@m.com');
    test.equals(lucas.phone, '123456789');
    test.deepEqual(lucas.place, facilityc);
    test.equals(lucas.type, 'national-admin');
    var milan = data[1];
    test.equals(milan.id, 'org.couchdb.user:y');
    test.equals(milan.username, 'milan');
    test.equals(milan.fullname, 'Milan A');
    test.equals(milan.email, 'm@a.com');
    test.equals(milan.phone, '987654321');
    test.deepEqual(milan.place, facilityb);
    test.equals(milan.type, 'district-admin');
    test.equals(milan.external_id, 'LTT093');
    test.done();
  });
};

exports['getList filters out non-users'] = function(test) {
  test.expect(9);
  sinon.stub(controller, '_getAdmins').callsArg(0);
  sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
    {
      id: 'x',
      doc: {
        name: 'lucas',
        facility_id: 'c',
        fullname: 'Lucas M',
        email: 'l@m.com',
        phone: '123456789',
        roles: [ 'national-admin', 'data-entry' ]
      }
    },
    {
      id: 'org.couchdb.user:y',
      doc: {
        name: 'milan',
        facility_id: 'b',
        fullname: 'Milan A',
        email: 'm@a.com',
        phone: '987654321',
        roles: [ 'district-admin' ]
      }
    }
  ]);
  sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, [
    {
      _id: 'org.couchdb.user:x',
      name: 'lucas',
      fullname: 'Lucas M',
      email: 'l@m.com',
      phone: '123456789'
    },
    {
      _id: 'org.couchdb.user:y',
      name: 'milan',
      fullname: 'Milan A',
      email: 'm@a.com',
      phone: '987654321'
    }
  ]);
  controller.getList(function(err, data) {
    test.equal(err, null);
    test.equal(data.length, 1);
    var milan = data[0];
    test.equal(milan.id, 'org.couchdb.user:y');
    test.equal(milan.username, 'milan');
    test.equal(milan.fullname, 'Milan A');
    test.equal(milan.email, 'm@a.com');
    test.equal(milan.phone, '987654321');
    test.deepEqual(milan.place, facilityb);
    test.equal(milan.type, 'district-admin');
    test.done();
  });

};

exports['getList handles minimal users'] = function(test) {
  test.expect(9);
  sinon.stub(controller, '_getAdmins').callsArgWith(0, null, {
    gareth: 'abc'
  });
  sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
    {
      id: 'org.couchdb.user:x',
      doc: {
        name: 'lucas'
      }
    }
  ]);
  sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, []);
  controller.getList(function(err, data) {
    test.equal(err, null);
    test.equal(data.length, 1);
    var lucas = data[0];
    test.equal(lucas.id, 'org.couchdb.user:x');
    test.equal(lucas.username, 'lucas');
    test.equal(lucas.fullname, undefined);
    test.equal(lucas.email, undefined);
    test.equal(lucas.phone, undefined);
    test.equal(lucas.facility, undefined);
    test.equal(lucas.type, 'unknown');
    test.done();
  });
};

exports['getList replaces admins type'] = function(test) {
  test.expect(5);
  sinon.stub(controller, '_getAdmins').callsArgWith(0, null, {
    gareth: 'abc'
  });
  sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
    {
      id: 'org.couchdb.user:gareth',
      doc: {
        name: 'gareth'
      }
    }
  ]);
  sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, []);
  controller.getList(function(err, data) {
    test.equal(err, null);
    test.equal(data.length, 1);
    var gareth = data[0];
    test.equal(gareth.id, 'org.couchdb.user:gareth');
    test.equal(gareth.username, 'gareth');
    test.equal(gareth.type, 'admin');
    test.done();
  });
};

exports['getList does not replace admins type if roles exists'] = function(test) {
  test.expect(5);
  sinon.stub(controller, '_getAdmins').callsArgWith(0, null, {
    gareth: 'abc'
  });
  sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
    {
      id: 'org.couchdb.user:gareth',
      doc: {
        name: 'gareth',
        roles: ['national-admin']
      }
    }
  ]);
  sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, []);
  controller.getList(function(err, data) {
    test.equal(err, null);
    test.equal(data.length, 1);
    var gareth = data[0];
    test.equal(gareth.id, 'org.couchdb.user:gareth');
    test.equal(gareth.username, 'gareth');
    test.equal(gareth.type, 'national-admin');
    test.done();
  });
};

exports['getList returns errors from users service'] = function(test) {
  test.expect(1);
  sinon.stub(controller, '_getAllUsers').callsArgWith(0, 'not found');
  controller.getList(function(err) {
      test.equal(err, 'not found');
      test.done();
  });
};

exports['getList returns errors from facilities service'] = function(test) {
  test.expect(1);
  sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
      {
        id: 'x',
        doc: {
          name: 'lucas',
          facility_id: 'c',
          fullname: 'Lucas M',
          email: 'l@m.com',
          phone: '123456789',
          roles: [ 'national-admin', 'data-entry' ]
        }
      },
      {
        id: 'org.couchdb.user:y',
        doc: {
          name: 'milan',
          facility_id: 'b',
          fullname: 'Milan A',
          email: 'm@a.com',
          phone: '987654321',
          roles: [ 'district-admin' ]
        }
      }
  ]);
  sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, []);
  controller._getFacilities.restore();
  sinon.stub(controller, '_getFacilities').callsArgWith(0, 'BOOM');
  controller.getList(function(err) {
    test.equal(err, 'BOOM');
    test.done();
  });
};

exports['getList returns errors from admins service'] = function(test) {
  test.expect(1);
  sinon.stub(controller, '_getAllUsers').callsArgWith(0, null, [
    {
      id: 'org.couchdb.user:x',
      doc: {
        name: 'lucas',
        facility_id: 'c',
        fullname: 'Lucas M',
        email: 'l@m.com',
        phone: '123456789',
        roles: [ 'national-admin', 'data-entry' ]
      }
    },
    {
      id: 'org.couchdb.user:y',
      doc: {
        name: 'milan',
        facility_id: 'b',
        fullname: 'Milan A',
        email: 'm@a.com',
        phone: '987654321',
        roles: [ 'district-admin' ]
      }
    }
  ]);
  sinon.stub(controller, '_getAllUserSettings').callsArgWith(0, null, []);
  sinon.stub(controller, '_getAdmins').callsArgWith(0, 'POW');
  controller.getList(function(err) {
    test.equal(err, 'POW');
    test.done();
  });
};

exports['deleteUser returns _users insert errors'] = function(test) {
  test.expect(2);
  sinon.stub(db._users, 'get').callsArgWith(1, null, {});
  var insert = sinon.stub(db._users, 'insert').callsArgWith(1, 'Not Found');
  controller.deleteUser('foo', function(err) {
    test.equal(err, 'Not Found');
    test.equal(insert.callCount, 1);
    test.done();
  });
};

exports['deleteUser sets _deleted on the user doc'] = function(test) {
  test.expect(3);
  var expect = {
    _id: 'foo',
    starsign: 'aries',
    _deleted: true
  };
  sinon.stub(db._users, 'get').callsArgWith(1, null, {
    _id: 'foo',
    starsign: 'aries',
  });
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
  var usersInsert = sinon.stub(db._users, 'insert').callsArg(1);
  sinon.stub(db.medic, 'insert').callsArg(1);
  controller.deleteUser('foo', function(err) {
    test.equal(err, undefined);
    test.equal(usersInsert.callCount, 1);
    test.deepEqual(usersInsert.firstCall.args[0], expect);
    test.done();
  });
};

exports['deleteUser sets _deleted on the user-settings doc'] = function(test) {
  test.expect(3);
  var expect = {
    _id: 'foo',
    starsign: 'aries',
    _deleted: true
  };
  sinon.stub(db._users, 'get').callsArgWith(1, null, {
    _id: 'foo',
    starsign: 'aries',
  });
  sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
  var usersInsert = sinon.stub(db._users, 'insert').callsArg(1);
  sinon.stub(db.medic, 'insert').callsArg(1);
  controller.deleteUser('org.couchdb.user:gareth', function(err) {
    test.equal(err, undefined);
    test.equal(usersInsert.callCount, 1);
    test.deepEqual(usersInsert.firstCall.args[0], expect);
    test.done();
  });
};

exports['createPlace assigns new place'] = function(test) {
  sinon.stub(places, 'getOrCreatePlace').callsArgWith(1, null, {
    _id: 'santos'
  });
  controller._createPlace(userData, {}, function(err, data) {
    test.ok(!err);
    test.equal(data.place._id, 'santos');
    test.done();
  });
};

exports['createUserSettings returns error from db insert'] = function(test) {
  sinon.stub(db.medic, 'insert').callsArgWith(2, 'yucky');
  controller._createUserSettings(userData, {}, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['createUserSettings sets up response'] = function(test) {
  sinon.stub(db.medic, 'insert').callsArgWith(2, null, {
    id: 'abc',
    rev: '1-xyz'
  });
  controller._createUserSettings(userData, {}, function(err, data, response) {
    test.ok(!err);
    test.deepEqual(response, {
      'user-settings': {
        id: 'abc',
        rev: '1-xyz'
      }
    });
    test.done();
  });
};

exports['_updateUser returns response'] = function(test) {
  sinon.stub(db._users, 'insert').callsArgWith(2, null, {
    id: 'abc',
    rev: '1-xyz'
  });
  controller._updateUser('john', userData, function(err, body) {
    test.ok(!err);
    test.deepEqual(body, {
      id: 'abc',
      rev: '1-xyz'
    });
    test.done();
  });
};

exports['_updateUserSettings returns response'] = function(test) {
  sinon.stub(db.medic, 'insert').callsArgWith(2, null, {
    id: 'abc',
    rev: '1-xyz'
  });
  controller._updateUserSettings('john', userData, function(err, body) {
    test.ok(!err);
    test.deepEqual(body, {
      id: 'abc',
      rev: '1-xyz'
    });
    test.done();
  });
};

exports['createUserSettings sets default roles on user-settings'] = function(test) {
  sinon.stub(db.medic, 'insert', function(settings) {
    test.deepEqual(settings.roles, [
      'district-manager',
      'kujua_user',
      'data_entry',
      'district_admin'
    ]);
    test.done();
  });
  controller._createUserSettings({});
};


exports['createContact returns error from db insert'] = function(test) {
  sinon.stub(people, 'createPerson').callsArgWith(1, 'yucky');
  controller._createContact(userData, {}, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['createContact updates contact property'] = function(test) {
  sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, null, {
    id: 'abc'
  });
  controller._createContact(userData, {}, function(err, data) {
    test.ok(!err);
    test.deepEqual(data.contact, { id: 'abc' });
    test.done();
  });
};

exports['createContact sets up response'] = function(test) {
  sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, null, {
    _id: 'abc',
    _rev: '1-xyz'
  });
  controller._createContact(userData, {}, function(err, data, response) {
    test.ok(!err);
    test.deepEqual(response, {
      contact: {
        id: 'abc',
        rev: '1-xyz'
      }
    });
    test.done();
  });
};

exports['_createUser sets default roles on user'] = function(test) {
  sinon.stub(db._users, 'insert', function(user) {
    test.deepEqual(user.roles, [
      'district-manager',
      'kujua_user',
      'data_entry',
      'district_admin'
    ]);
    test.done();
  });
  controller._createUser({});
};

exports['_createUser returns error from db insert'] = function(test) {
  sinon.stub(db._users, 'insert').callsArgWith(2, 'yucky');
  controller._createUser(userData, {}, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['_createUser sets up response'] = function(test) {
  sinon.stub(db._users, 'insert').callsArgWith(2, null, {
    id: 'abc',
    rev: '1-xyz'
  });
  controller._createUser(userData, {}, function(err, data, response) {
    test.ok(!err);
    test.deepEqual(response, {
      'user': {
        id: 'abc',
        rev: '1-xyz'
      }
    });
    test.done();
  });
};

exports['createUser returns error if missing fields.'] = function(test) {
  test.expect(11);
  // empty
  controller.createUser({}, function(err) {
    test.ok(err);
  });
  // missing username
  controller.createUser({
    'password': 'x',
    'place': 'x',
    'contact': { 'parent': 'x'}
  }, function(err) {
    test.ok(err);
    test.equal(err.code, 400);
  });
  // missing password
  controller.createUser({
    'username': 'x',
    'place': 'x',
    'contact': { 'parent': 'x'}
  }, function(err) {
    test.ok(err);
    test.equal(err.code, 400);
  });
  // missing place
  controller.createUser({
    'username': 'x',
    'password': 'x',
    'contact': { 'parent': 'x'}
  }, function(err) {
    test.ok(err);
    test.equal(err.code, 400);
  });
  // missing contact
  controller.createUser({
    'username': 'x',
    'place': 'x',
    'contact': { 'parent': 'x'}
  }, function(err) {
    test.ok(err);
    test.equal(err.code, 400);
  });
  // missing contact.parent
  controller.createUser({
    'username': 'x',
    'place': 'x',
    'contact': {}
  }, function(err) {
    test.ok(err);
    test.equal(err.code, 400);
  });
  test.done();
};

exports['createUser returns error if contact.parent lookup fails.'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArg(1);
  sinon.stub(controller, '_createPlace').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_setContactParent').callsArgWith(2, 'kablooey');
  controller.createUser(userData, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['createUser returns error if place lookup fails.'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArg(1);
  sinon.stub(controller, '_createPlace').callsArgWith(2, 'fail');
  controller.createUser(userData, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['createUser returns error if place is not within contact.'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArg(1);
  sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
  sinon.stub(places, 'getPlace').callsArgWith(1, null, {
    '_id': 'miami',
    parent: {
      '_id': 'florida'
    }
  });
  userData.place = 'georgia';
  controller.createUser(userData, function(err) {
    test.equal(err.code, 400);
    test.equal(err.message, 'Contact is not within place.');
    test.done();
  });
};

exports['createUser succeeds if contact and place are the same.'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArg(1);
  sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
  sinon.stub(controller, '_createUser').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_createContact').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_updatePlace').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_createUserSettings').callsArgWith(2, null, {}, {});
  sinon.stub(places, 'getPlace').callsArgWith(1, null, {
    '_id': 'foo'
  });
  userData.place = 'foo';
  controller.createUser(userData, function(err) {
    test.ok(!err);
    test.done();
  });
};

exports['createUser succeeds if contact is within place.'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArg(1);
  sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
  sinon.stub(controller, '_createUser').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_createContact').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_updatePlace').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_createUserSettings').callsArgWith(2, null, {}, {});
  sinon.stub(places, 'getPlace').callsArgWith(1, null, {
    '_id': 'miami',
    parent: {
      '_id': 'florida'
    }
  });
  userData.place = 'florida';
  controller.createUser(userData, function(err, response) {
    test.ok(!err);
    test.deepEqual(response, {});
    test.done();
  });
};

exports['createUser returns response object'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArg(1);
  sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
  sinon.stub(controller, '_createUser').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_createContact').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_updatePlace').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_createUserSettings').callsArgWith(2, null, {}, {
    biz: 'baz'
  });
  sinon.stub(places, 'getPlace').callsArg(1);
  sinon.stub(controller, '_hasParent').returns(true);
  controller.createUser(userData, function(err, response) {
    test.ok(!err);
    test.deepEqual(response, {
      biz: 'baz'
    });
    test.done();
  });
};

exports['createUser fails if new username does not validate'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArgWith(1, 'sorry');
  var insert = sinon.stub(db.medic, 'insert');
  controller.createUser(userData, function(err) {
    test.equals(err, 'sorry');
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['createUser errors if username exists in _users db'] = function(test) {
  sinon.stub(db._users, 'get').callsArgWith(1, null, 'bob lives here already.');
  var insert = sinon.stub(db.medic, 'insert');
  controller.createUser(userData, function(err) {
    test.deepEqual(err, {
      code: 400,
      message: 'Username "x" already taken.'
    });
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['createUser errors if username exists in medic db'] = function(test) {
  sinon.stub(db._users, 'get').callsArg(1);
  sinon.stub(db.medic, 'get').callsArgWith(1, null, 'jane lives here too.');
  var insert = sinon.stub(db.medic, 'insert');
  controller.createUser(userData, function(err) {
    test.deepEqual(err, {
      code: 400,
      message: 'Username "x" already taken.'
    });
    test.equal(insert.callCount, 0);
    test.done();
  });
};

exports['setContactParent resolves contact parent in waterfall'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArg(1);
  sinon.stub(controller, '_createPlace').callsArgWith(2, null, userData, {});
  sinon.stub(places, 'getPlace').callsArgWith(1, null, {
    biz: 'marquee'
  });
  sinon.stub(controller, '_hasParent').returns(true);
  // checking function after setContactParent
  sinon.stub(controller, '_createContact', function(data) {
    test.deepEqual(data.contact.parent, { biz: 'marquee' });
    test.done();
  });
  controller.createUser(userData);
};

exports['updatePlace resolves place\'s contact in waterfall'] = function(test) {
  sinon.stub(controller, '_validateNewUsername').callsArg(1);
  sinon.stub(controller, '_createPlace').callsArgWith(2, null, {}, {});
  sinon.stub(controller, '_setContactParent').callsArgWith(2, null, userData, {});
  sinon.stub(people, 'getOrCreatePerson').callsArgWith(1, null, {
    name: 'mickey'
  });
  sinon.stub(db.medic, 'insert').callsArg(1);
  sinon.stub(controller, '_createUser', function(data) {
    test.deepEqual(data.contact, { name: 'mickey' });
    test.deepEqual(data.place.contact, { name: 'mickey' });
    test.done();
  });
  controller.createUser(userData);
};

exports['updateUser errors if place, type and password is undefined'] = function(test) {
  controller.updateUser('paul', {}, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['updateUser errors on unknown property'] = function(test) {
  controller.updateUser('paul', {foo: 'bar'}, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['updateUser fails if place fetch fails'] = function(test) {
  var data = {
    place: 'x'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  sinon.stub(places, 'getPlace').callsArgWith(1, 'Not today pal.');
  var update = sinon.stub(controller, '_updateUser');
  var updateSettings = sinon.stub(controller, '_updateUserSettings');
  controller.updateUser('paul', data, function(err) {
    test.ok(err);
    test.same(update.callCount, 0);
    test.same(updateSettings.callCount, 0);
    test.done();
  });
};

exports['updateUser fails if user not found'] = function(test) {
  var data = {
    type: 'x'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, 'not found');
  var update = sinon.stub(controller, '_updateUser');
  var updateSettings = sinon.stub(controller, '_updateUserSettings');
  controller.updateUser('paul', data, function(err) {
    test.ok(err);
    test.same(update.callCount, 0);
    test.same(updateSettings.callCount, 0);
    test.done();
  });
};

exports['updateUser fails if user settings not found'] = function(test) {
  var data = {
    type: 'x'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, 'too rainy today');
  var update = sinon.stub(controller, '_updateUser');
  var updateSettings = sinon.stub(controller, '_updateUserSettings');
  controller.updateUser('paul', data, function(err) {
    test.ok(err);
    test.same(update.callCount, 0);
    test.same(updateSettings.callCount, 0);
    test.done();
  });
};

exports['updateUser fails if _users db insert fails'] = function(test) {
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  sinon.stub(db.medic, 'insert').callsArgWith(2, null, {});
  sinon.stub(db._users, 'insert').callsArgWith(2, 'shiva was here');
  controller.updateUser('georgi', {type: 'x'}, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['updateUser fails if medic db insert fails'] = function(test) {
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  sinon.stub(db.medic, 'insert').callsArgWith(2, 'shiva strikes again');
  sinon.stub(db._users, 'insert').callsArgWith(2, null, {});
  controller.updateUser('georgi', {type: 'x'}, function(err) {
    test.ok(err);
    test.done();
  });
};

exports['updateUser succeeds if type is defined'] = function(test) {
  var data = {
    type: 'x'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  var update = sinon.stub(controller, '_updateUser').callsArg(2);
  var updateSettings = sinon.stub(controller, '_updateUserSettings').callsArg(2);
  controller.updateUser('paul', data, function(err) {
    test.ok(!err);
    test.same(update.callCount, 1);
    test.same(updateSettings.callCount, 1);
    test.done();
  });
};

exports['updateUser succeeds if password is defined'] = function(test) {
  var data = {
    password: 'x'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArg(1);
  sinon.stub(controller, '_updateAdminPassword').callsArg(2);
  var update = sinon.stub(controller, '_updateUser').callsArg(2);
  var updateSettings = sinon.stub(controller, '_updateUserSettings').callsArg(2);
  controller.updateUser('paul', data, function(err) {
    test.ok(!err);
    test.same(update.callCount, 1);
    test.same(updateSettings.callCount, 1);
    test.done();
  });
};

exports['updateUser succeeds if place is defined and found'] = function(test) {
  var data = {
    place: 'x'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  sinon.stub(places, 'getPlace').callsArg(1);
  var update = sinon.stub(controller, '_updateUser').callsArg(2);
  var updateSettings = sinon.stub(controller, '_updateUserSettings').callsArg(2);
  controller.updateUser('paul', data, function(err) {
    test.ok(!err);
    test.same(update.callCount, 1);
    test.same(updateSettings.callCount, 1);
    test.done();
  });
};

exports['updateUser type param updates roles on user and user-settings doc'] = function(test) {
  test.expect(5);
  var data = {
    type: 'rebel'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  var update = sinon.stub(controller, '_updateUser', function(id, data, callback) {
    test.deepEqual(data.roles, ['rebel', undefined]);
    callback();
  });
  var updateSettings = sinon.stub(controller, '_updateUserSettings', function(id, data, callback) {
    test.deepEqual(data.roles, ['rebel', undefined]);
    callback();
  });
  controller.updateUser('paul', data, function(err) {
    test.ok(!err);
    test.same(update.callCount, 1);
    test.same(updateSettings.callCount, 1);
    test.done();
  });
};

exports['updateUser updates password on user doc'] = function(test) {
  test.expect(4);
  var data = {
    password: 'whachamacallit'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  sinon.stub(places, 'getPlace').callsArg(1);
  sinon.stub(controller, '_updateAdminPassword').callsArg(2);
  var update = sinon.stub(controller, '_updateUser', function(id, data, callback) {
    test.equal(data.password, 'whachamacallit');
    callback();
  });
  var updateSettings = sinon.stub(controller, '_updateUserSettings').callsArg(2);
  controller.updateUser('paul', data, function(err) {
    test.ok(!err);
    test.same(update.callCount, 1);
    test.same(updateSettings.callCount, 1);
    test.done();
  });
};

exports['updateUser updates couchdb admin passwords also'] = function(test) {
  test.expect(4);
  var data = {
    password: 'whachamacallit'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  sinon.stub(controller, '_updateAdminPassword', function(username, pw, cb) {
    test.equal(pw, 'whachamacallit');
    cb();
  });
  var update = sinon.stub(controller, '_updateUser').callsArg(2);
  var updateSettings = sinon.stub(controller, '_updateUserSettings').callsArg(2);
  controller.updateUser('paul', data, function(err) {
    test.ok(!err);
    test.same(update.callCount, 1);
    test.same(updateSettings.callCount, 1);
    test.done();
  });
};

exports['updateUser updates facility_id on user and user settings'] = function(test) {
  test.expect(5);
  var data = {
    place: 'paris'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {
    facility_id: 'maine'
  });
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {
    facility_id: 'maine'
  });
  sinon.stub(places, 'getPlace').callsArg(1);
  var update = sinon.stub(controller, '_updateUser', function(id, user, cb) {
    test.equal(user.facility_id, 'paris');
    cb();
  });
  var updateSettings = sinon.stub(controller, '_updateUserSettings', function(id, settings, cb) {
    test.equal(settings.facility_id, 'paris');
    cb();
  });
  controller.updateUser('paul', data, function(err) {
    test.ok(!err);
    test.same(update.callCount, 1);
    test.same(updateSettings.callCount, 1);
    test.done();
  });
};

exports['updateUser updates user, user settings doc and couchdb admins'] = function(test) {
  test.expect(14);
  var data = {
    place: 'el paso',
    type: 'rambler',
    password: '*.*'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {
    facility_id: 'maine',
    roles: ['bartender'],
    shoes: 'dusty boots'
  });
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {
    facility_id: 'maine',
    phone: '123',
    known: false
  });
  sinon.stub(places, 'getPlace').callsArg(1);
  sinon.stub(controller, '_updateAdminPassword', function(user, pw, cb) {
    test.equal(user, 'paul');
    test.equal(pw, '*.*');
    cb();
  });
  var update = sinon.stub(controller, '_updateUser', function(id, user, cb) {
    test.equal(user.facility_id, 'el paso');
    test.deepEqual(user.roles, ['rambler', undefined]);
    test.equal(user.shoes, 'dusty boots');
    test.equal(user.password, '*.*');
    test.equal(user.type, 'user');
    cb();
  });
  var updateSettings = sinon.stub(controller, '_updateUserSettings', function(id, settings, cb) {
    test.equal(settings.facility_id, 'el paso');
    test.equal(settings.phone, '123');
    test.equal(settings.known, false);
    test.equal(settings.type, 'user-settings');
    cb();
  });
  controller.updateUser('paul', data, function(err) {
    test.ok(!err);
    test.same(update.callCount, 1);
    test.same(updateSettings.callCount, 1);
    test.done();
  });
};

exports['updateUser sets up response'] = function(test) {
  var data = {
    fullname: 'George'
  };
  sinon.stub(controller, '_validateUser').callsArgWith(1, null, {});
  sinon.stub(controller, '_validateUserSettings').callsArgWith(1, null, {});
  sinon.stub(db.medic, 'insert').callsArgWith(2, null, {
    id: 'abc',
    rev: '1-xyz'
  });
  sinon.stub(db._users, 'insert').callsArgWith(2, null, {
    id: 'def',
    rev: '1-uvw'
  });
  controller.updateUser('georgi', data, function(err, resp) {
    test.ok(!err);
    test.deepEqual(resp.user, {
      id: 'def',
      rev: '1-uvw'
    });
    test.deepEqual(resp['user-settings'], {
      id: 'abc',
      rev: '1-xyz'
    });
    test.done();
  });
};
