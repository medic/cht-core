var sinon = require('sinon'),
    db = require('../../../db'),
    utils = require('../utils'),
    migration = require('../../../migrations/add-permissions-configuration');

exports.tearDown = function (callback) {
  utils.restore(db.getSettings, db.request, db.getPath);
  db.settings = {};
  callback();
};

exports['run returns errors from getSettings'] = function(test) {
  test.expect(2);
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, 'boom');
  migration.run(function(err) {
    test.equals(err, 'boom');
    test.equals(getSettings.callCount, 1);
    test.done();
  });
};

exports['run does nothing if permissions already set'] = function(test) {
  test.expect(3);
  var permissions = [ { name: 'can_do_stuff', roles: [ 'national_admin' ] } ];
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { permissions: permissions } });
  var request = sinon.stub(db, 'request');
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getSettings.callCount, 1);
    test.equals(request.callCount, 0);
    test.done();
  });
};

exports['run returns errors from request'] = function(test) {
  test.expect(4);
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { permissions: [] } });
  var request = sinon.stub(db, 'request').callsArgWith(1, 'boom');
  var getPath = sinon.stub(db, 'getPath').returns('somepath');
  db.settings = { ddoc: 'someddoc' };
  migration.run(function(err) {
    test.equals(err, 'boom');
    test.equals(getSettings.callCount, 1);
    test.equals(request.callCount, 1);
    test.equals(getPath.callCount, 1);
    test.done();
  });
};

exports['run sets the default permissions'] = function(test) {
  test.expect(7);
  var getSettings = sinon.stub(db, 'getSettings').callsArgWith(0, null, { settings: { permissions: [] } });
  var request = sinon.stub(db, 'request').callsArgWith(1);
  var getPath = sinon.stub(db, 'getPath').returns('somepath');
  db.settings = { ddoc: 'someddoc' };
  migration.run(function(err) {
    test.equals(err, undefined);
    test.equals(getSettings.callCount, 1);
    test.equals(request.callCount, 1);
    test.equals(getPath.callCount, 1);
    test.equals(request.args[0][0].path, 'somepath/update_settings/someddoc');
    test.equals(request.args[0][0].method, 'put');
    test.same(request.args[0][0].body.permissions[0], {
      name: 'can_export_messages',
      roles: [
        'national_admin',
        'district_admin',
        'analytics'
      ]
    });
    test.done();
  });
};
