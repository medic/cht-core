var controller = require('../../controllers/users'),
    db = require('../../db'),
    utils = require('../utils'),
    sinon = require('sinon');

var facilitya = { _id: 'a', name: 'aaron' },
    facilityb = { _id: 'b', name: 'brian' },
    facilityc = { _id: 'c', name: 'cathy' };

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
    controller._getAdmins,
    controller._getAllUsers,
    controller._getAllUserSettings,
    controller._getFacilities,
    controller._getOrCreateUser,
    controller.getList
  );
  callback();
};

exports.setUp = function(callback) {
  sinon.stub(controller, '_getFacilities').callsArgWith(0, null, [
    facilitya,
    facilityb,
    facilityc,
  ]);
  //sinon.stub(controller, '_getAdmins').callsArgWith(0, null, {
  //  gareth: 'abc'
  //});
  callback();
};

exports['getSettingsUpdates removes user doc specific fields'] = function(test) {
  var data = {
    name: 'john',
    email: 'john@gmail.com',
    password: 'foo',
    roles: ['foo'],
    starsign: 'libra'
  };
  var settings = controller._getSettingsUpdates(data);
  test.equal(settings.password, undefined);
  test.equal(settings.roles, undefined);
  test.done();
};

exports['getUserUpdates enforces name field based on id'] = function(test) {
  var data = {
    name: 'sam',
    email: 'john@gmail.com'
  };
  var user = controller._getUserUpdates('org.couchdb.user:john', data);
  test.equal(user.name , 'john');
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
  test.expect(16);
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
      phone: '987654321'
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
    test.deepEqual(lucas.facility, facilityc);
    test.equals(lucas.type, 'national-admin');
    var milan = data[1];
    test.equals(milan.id, 'org.couchdb.user:y');
    test.equals(milan.username, 'milan');
    test.equals(milan.fullname, 'Milan A');
    test.equals(milan.email, 'm@a.com');
    test.equals(milan.phone, '987654321');
    test.deepEqual(milan.facility, facilityb);
    test.equals(milan.type, 'district-admin');
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
    test.deepEqual(milan.facility, facilityb);
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

exports['createOrUpdate creates a user\'s settings'] = function(test) {

  test.expect(5);

  var settings = {
    name: 'sally',
    favcolour: 'aqua',
    starsign: 'libra'
  };

  var user = {
    name: 'sally',
    facility_id: 'b'
  };

  var expectedUser = {
    _id: 'org.couchdb.user:sally',
    type: 'user',
    name: 'sally',
    facility_id: 'b'
  };

  var expectedSettings = {
    _id: 'org.couchdb.user:sally',
    type: 'user-settings',
    name: 'sally',
    favcolour: 'aqua',
    starsign: 'libra'
  };

  sinon.stub(db._users, 'get').callsArgWith(1, {error: 'not_found'});
  sinon.stub(db.medic, 'get').callsArgWith(1, {error: 'not_found'});
  var usersInsert = sinon.stub(db._users, 'insert').callsArg(1);
  var medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);

  controller._createOrUpdate('org.couchdb.user:sally', settings, user, function(err) {
    test.equal(err, undefined);
    test.equal(usersInsert.callCount, 1);
    test.equal(medicInsert.callCount, 1);
    test.deepEqual(usersInsert.firstCall.args[0], expectedUser);
    test.deepEqual(medicInsert.firstCall.args[0], expectedSettings);
    test.done();
  });

};

exports['createOrUpdate updates the user and settings'] = function(test) {

  test.expect(7);

  var user = {
    name: 'jerome',
    facility_id: 'b'
  };

  var settings = {
    name: 'jerome',
    favcolour: 'aqua',
    starsign: 'libra'
  };

  var expectedUser = {
    _id: 'org.couchdb.user:jerome',
    name: 'jerome',
    facility_id: 'b'
  };

  var expectedSettings = {
    _id: 'org.couchdb.user:jerome',
    type: 'user-settings',
    name: 'jerome',
    favcolour: 'aqua',
    starsign: 'libra'
  };

  var usersGet = sinon.stub(db._users, 'get').callsArgWith(1, null, {
    _id: 'org.couchdb.user:jerome',
    name: 'jerome',
    facility_id: 'a'
  });

  sinon.stub(db.medic, 'get').callsArgWith(1, null, {
    _id: 'org.couchdb.user:jerome',
    type: 'user-settings',
    name: 'jerome',
    favcolour: 'teal'
  });

  var usersInsert = sinon.stub(db._users, 'insert').callsArg(1);
  var medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);

  controller._createOrUpdate('org.couchdb.user:jerome', settings, user, function(err) {
    test.equal(err, undefined);
    test.equal(usersGet.callCount, 1);
    test.equal(usersGet.firstCall.args[0], 'org.couchdb.user:jerome');
    test.equal(usersInsert.callCount, 1);
    test.equal(medicInsert.callCount, 1);
    test.deepEqual(usersInsert.firstCall.args[0], expectedUser);
    test.deepEqual(medicInsert.firstCall.args[0], expectedSettings);
    test.done();
  });

};

exports['createOrUpdate updates the password'] = function(test) {

  var updates = {
    favcolour: 'aqua',
    starsign: 'libra',
    password: 'xyz'
  };

  var expected = {
    _id: 'org.couchdb.user:jerome',
    name: 'jerome',
    favcolour: 'aqua',
    starsign: 'libra',
    password: 'xyz'
  };

  sinon.stub(controller, '_getAdmins').callsArgWith(0, null, {
    gareth: 'abc'
  });
  sinon.stub(db._users, 'get').callsArgWith(1, null, {
    _id: 'org.couchdb.user:jerome',
    name: 'jerome',
    favcolour: 'turquoise',
    derived_key: 'abc',
    salt: 'def'
  });

  sinon.stub(db.medic, 'get').callsArgWith(1, null, {
    _id: 'org.couchdb.user:jerome',
    type: 'user-settings',
    name: 'jerome',
    favcolour: 'teal'
  });

  sinon.stub(db.medic, 'insert').callsArg(1);
  var usersInsert = sinon.stub(db._users, 'insert').callsArg(1);

  controller._createOrUpdate('org.couchdb.user:jerome', null, updates, function(err) {
    test.equal(err, undefined);
    test.deepEqual(usersInsert.firstCall.args[0], expected);
    test.done();
  });

};


exports['createOrUpdate updates admin passwords'] = function(test) {
  test.expect(2);
  var updates = {
    favcolour: 'aqua',
    starsign: 'libra',
    password: 'xyz'
  };
  sinon.stub(controller, '_getAdmins').callsArgWith(0, null, {
    gareth: 'abc'
  });
  sinon.stub(db._users, 'get').callsArgWith(1, null, {
    _id: 'org.couchdb.user:gareth',
    name: 'gareth',
    favcolour: 'turquoise',
    derived_key: 'abc',
    salt: 'def'
  });
  sinon.stub(db._users, 'insert').callsArgWith(1, null, {
    _id: 'org.couchdb.user:gareth',
    name: 'gareth',
    favcolour: 'aqua',
    starsign: 'libra',
    password: 'xyz'
  });
  var req = sinon.stub(db, 'request').callsArg(1);
  controller._createOrUpdate('org.couchdb.user:gareth', null, updates, function(err) {
    test.equal(err, undefined);
    test.deepEqual(req.firstCall.args[0], {
      method: 'PUT',
      path: '_config/admins/gareth',
      body: '"xyz"'
    });
    test.done();
  });
};


exports['createOrUpdate returns errors'] = function(test) {
  test.expect(1);
  var updates = {
    favcolour: 'aqua',
    starsign: 'libra'
  };
  sinon.stub(db._users, 'get').callsArgWith(1, 'Server error');
  controller._createOrUpdate('org.couchdb.user:jerome', null, updates, function(err) {
    test.equal(err, 'Server error');
    test.done();
  });
};

exports['createOrUpdate can update settings only'] = function(test) {
  test.expect(5);
  var updates = {
    favcolour: 'aqua',
    starsign: 'libra'
  };
  var expectedSettings = {
    _id: 'org.couchdb.user:jerome',
    type: 'user-settings',
    name: 'jerome',
    favcolour: 'aqua',
    starsign: 'libra'
  };
  var medicGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, {
    _id: 'org.couchdb.user:jerome',
    type: 'user-settings',
    name: 'jerome',
    favcolour: 'teal'
  });
  sinon.stub(db._users, 'insert').callsArg(1);
  var medicInsert = sinon.stub(db.medic, 'insert').callsArg(1);
  controller._createOrUpdate('org.couchdb.user:jerome', updates, function(err) {
    test.equal(err, undefined);
    test.equal(medicGet.callCount, 1);
    test.equal(medicGet.firstCall.args[0], 'org.couchdb.user:jerome');
    test.equal(medicInsert.callCount, 1);
    test.deepEqual(medicInsert.firstCall.args[0], expectedSettings);
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

