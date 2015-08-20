var sinon = require('sinon'),
    db = require('../db'),
    config = require('../config');

exports.tearDown = function (callback) {
  if (db.medic.get.restore) {
    db.medic.get.restore();
  }
  if (db.medic.insert.restore) {
    db.medic.insert.restore();
  }
  callback();
};

exports['updateSettingsDoc returns get errors'] = function(test) {
  test.expect(2);
  var get = sinon.stub(db.medic, 'get').callsArgWith(1, 'boom');
  config.updateSettingsDoc({ }, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err, 'boom');
    test.done();
  });
};

exports['updateSettingsDoc does nothing if revs match'] = function(test) {
  test.expect(3);
  var get = sinon.stub(db.medic, 'get').callsArgWith(1, null, { ddocRev: 5 });
  var insert = sinon.stub(db.medic, 'insert').callsArgWith(1, 'boom');
  config.updateSettingsDoc({ _rev: 5 }, function(err) {
    test.equals(err, null);
    test.equals(get.callCount, 1);
    test.equals(insert.callCount, 0);
    test.done();
  });
};

exports['updateSettingsDoc updates the settings doc'] = function(test) {
  test.expect(4);
  var oldSettings = {
    _id: 'medic-settings',
    ddocRev: 4,
    app_settings: { hello: 'universe', test: false }
  };
  var ddoc = {
    _rev: 5,
    app_settings: { hello: 'world' }
  };
  var expected = {
    _id: 'medic-settings',
    ddocRev: 5,
    app_settings: { hello: 'world' }
  };
  var get = sinon.stub(db.medic, 'get').callsArgWith(1, null, oldSettings);
  var insert = sinon.stub(db.medic, 'insert').callsArgWith(1);
  config.updateSettingsDoc(ddoc, function(err) {
    test.equals(err, null);
    test.equals(get.callCount, 1);
    test.equals(insert.callCount, 1);
    test.same(insert.args[0][0], expected);
    test.done();
  });
};

exports['updateSettingsDoc creates the settings doc'] = function(test) {
  test.expect(4);
  var ddoc = {
    _rev: 5,
    app_settings: { hello: 'world' }
  };
  var expected = {
    _id: 'medic-settings',
    ddocRev: 5,
    app_settings: { hello: 'world' }
  };
  var get = sinon.stub(db.medic, 'get').callsArgWith(1, { statusCode: 404 });
  var insert = sinon.stub(db.medic, 'insert').callsArgWith(1);
  config.updateSettingsDoc(ddoc, function(err) {
    test.equals(err, null);
    test.equals(get.callCount, 1);
    test.equals(insert.callCount, 1);
    test.same(insert.args[0][0], expected);
    test.done();
  });
};