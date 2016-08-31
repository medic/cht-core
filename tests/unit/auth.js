var request = require('request'),
    url = require('url'),
    sinon = require('sinon'),
    auth = require('../../auth'),
    utils = require('./utils'),
    config = require('../../config'),
    db = require('../../db');

exports.setUp = function(callback) {
  callback();
};

exports.tearDown = function (callback) {
  utils.restore(request.get, request.head, url.format, config.get);
  callback();
};

exports['auth returns error when not logged in'] = function(test) {
  test.expect(9);
  db.settings = {
    protocol: 'protocol',
    port: 'port',
    host: 'hostname',
    db: 'dbName',
    auditDb: 'auditDbName',
    ddoc: 'medic'
  };
  var format = sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get').callsArgWith(1, null, null);
  auth.check({ }, null, null, function(err) {
    test.equals(format.callCount, 1);
    test.equals(format.args[0][0].protocol, 'protocol');
    test.equals(format.args[0][0].hostname, 'hostname');
    test.equals(format.args[0][0].port, 'port');
    test.equals(format.args[0][0].pathname, '/_session');
    test.equals(get.callCount, 1);
    test.equals(get.args[0][0].url, 'http://abc.com');
    test.equals(err.message, 'Not logged in');
    test.equals(err.code, 401);
    test.done();
  });
};

exports['auth returns error when no user context'] = function(test) {
  test.expect(4);
  var format = sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get').callsArgWith(1, null, null, { roles: [] });
  auth.check({ }, null, null, function(err) {
    test.equals(format.callCount, 1);
    test.equals(get.callCount, 1);
    test.equals(err.message, 'Not logged in');
    test.equals(err.code, 401);
    test.done();
  });
};

exports['auth returns error when request errors'] = function(test) {
  test.expect(5);
  var format = sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get').callsArgWith(1, 'boom');
  auth.check({ }, null, null, function(err) {
    test.equals(format.callCount, 1);
    test.equals(get.callCount, 1);
    test.equals(get.args[0][0].url, 'http://abc.com');
    test.equals(err.message, 'Not logged in');
    test.equals(err.code, 401);
    test.done();
  });
};

exports['auth returns error when no has insufficient privilege'] = function(test) {
  test.expect(3);
  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz' ] } };
  sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get').callsArgWith(1, null, null, userCtx);
  sinon.stub(config, 'get').returns([ { name: 'can_edit', roles: [ 'abc' ] } ]);
  auth.check({ }, 'can_edit', district, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err.message, 'Insufficient privileges');
    test.equals(err.code, 403);
    test.done();
  });
};

exports['auth returns username for admin'] = function(test) {
  test.expect(4);
  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ '_admin' ] } };
  sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get').callsArgWith(1, null, null, userCtx);
  auth.check({ }, 'can_edit', district, function(err, ctx) {
    test.equals(get.callCount, 1);
    test.equals(err, null);
    test.equals(ctx.user, 'steve');
    test.equals(ctx.district, null);
    test.done();
  });
};

exports['auth returns username and district'] = function(test) {
  test.expect(6);
  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
  var format = sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get');
  get.onFirstCall().callsArgWith(1, null, null, userCtx);
  get.onSecondCall().callsArgWith(1, null, null, { facility_id: district });
  sinon.stub(config, 'get').returns([ { name: 'can_edit', roles: [ 'district_admin' ] } ]);
  auth.check({ }, 'can_edit', district, function(err, ctx) {
    test.equals(format.callCount, 2);
    test.equals(format.args[1][0].pathname, '/_users/org.couchdb.user:steve');
    test.equals(get.callCount, 2);
    test.equals(err, null);
    test.equals(ctx.user, 'steve');
    test.equals(ctx.district, district);
    test.done();
  });
};

exports['auth returns error when requesting unallowed facility'] = function(test) {
  test.expect(3);
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
  sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get');
  get.onFirstCall().callsArgWith(1, null, null, userCtx);
  get.onSecondCall().callsArgWith(1, null, null, { facility_id: '123' });
  sinon.stub(config, 'get').returns([ { name: 'can_edit', roles: [ 'district_admin' ] } ]);
  auth.check({ }, 'can_edit', '789', function(err) {
    test.equals(get.callCount, 2);
    test.equals(err.message, 'Insufficient privileges');
    test.equals(err.code, 403);
    test.done();
  });
};

exports['auth accepts multiple required roles'] = function(test) {
  test.expect(4);
  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
  sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get');
  get.onFirstCall().callsArgWith(1, null, null, userCtx);
  get.onSecondCall().callsArgWith(1, null, null, { facility_id: district });
  sinon.stub(config, 'get').returns([
    { name: 'can_export_messages', roles: [ 'district_admin' ] },
    { name: 'can_export_contacts', roles: [ 'district_admin' ] }
  ]);
  auth.check({ }, [ 'can_export_messages', 'can_export_contacts' ], district, function(err, ctx) {
    test.equals(get.callCount, 2);
    test.equals(err, null);
    test.equals(ctx.user, 'steve');
    test.equals(ctx.district, district);
    test.done();
  });
};

exports['auth checks all required roles'] = function(test) {
  test.expect(3);
  var district = '123';
  var userCtx = { userCtx: { name: 'steve', roles: [ 'xyz', 'district_admin' ] } };
  sinon.stub(url, 'format').returns('http://abc.com');
  var get = sinon.stub(request, 'get').callsArgWith(1, null, null, userCtx);
  sinon.stub(config, 'get').returns([
    { name: 'can_export_messages', roles: [ 'district_admin' ] },
    { name: 'can_export_server_logs', roles: [ 'national_admin' ] }
  ]);
  auth.check({ }, [ 'can_export_messages', 'can_export_server_logs' ], district, function(err) {
    test.equals(get.callCount, 1);
    test.equals(err.message, 'Insufficient privileges');
    test.equals(err.code, 403);
    test.done();
  });
};

exports['checkUrl requests the given url and returns status'] = function(test) {
  test.expect(6);
  var format = sinon.stub(url, 'format').returns('http://abc.com');
  var head = sinon.stub(request, 'head').callsArgWith(1, null, { statusCode: 444 });
  auth.checkUrl({ params: { path: '/home/screen' } }, function(err, output) {
    test.equals(err, null);
    test.equals(format.callCount, 1);
    test.equals(format.args[0][0].pathname, '/home/screen');
    test.equals(head.callCount, 1);
    test.equals(head.args[0][0].url, 'http://abc.com');
    test.equals(output.status, 444);
    test.done();
  });
};
