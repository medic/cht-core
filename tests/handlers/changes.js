var sinon = require('sinon'),
    testUtils = require('../utils'),
    auth = require('../../auth'),
    config = require('../../config'),
    serverUtils = require('../../server-utils'),
    changes = require('../../handlers/changes');

exports.tearDown = function (callback) {
  testUtils.restore(
    auth.getUserCtx,
    auth.hasAllPermissions,
    auth.getFacilityId,
    serverUtils.serverError,
    serverUtils.error,
    config.get,
    console.error);

  callback();
};

exports['allows "can_access_directly" users direct access'] = function(test) {
  test.expect(2);

  var testReq = 'fake request';
  var testRes = 'fake response';

  var userCtx = 'fake userCtx';
  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions', function() { return true; });

  var proxy = {web: function(req, res) {
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.done();
  }};

  changes(proxy, testReq, testRes);
};

exports['allows access with the correct facilityId'] = function(test) {
  test.expect(2);

  var testReq = {query: {filter: 'medic/doc_by_place', id: 'facilityId'}};
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(false);

  var proxy = {web: function(req, res) {
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.done();
  }};

  changes(proxy, testReq, testRes);
};

exports['allows filtering with the erlang filter'] = function(test) {
  test.expect(2);

  var testReq = {query: {filter: 'erlang_filters/doc_by_place', id: 'facilityId'}};
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(false);

  var proxy = {web: function(req, res) {
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.done();
  }};

  changes(proxy, testReq, testRes);
};

exports['allows access to replicate medic settings'] = function(test) {
  test.expect(2);

  var testReq = {
    query: {
      filter: '_doc_ids',
      doc_ids: '["_design/medic"]'
  }};
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');

  var proxy = {web: function(req, res) {
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.done();
  }};

  changes(proxy, testReq, testRes);
};

exports['allows unallocated access when its configured and the user has permission'] = function(test) {
  test.expect(2);


  var testReq = {
    query: {
      filter: 'medic/doc_by_place',
      id: 'facilityId',
      unassigned: 'true'
    },
  };
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  var hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
  hasAllPermissions.withArgs(userCtx, 'can_access_directly').returns(false);
  hasAllPermissions.withArgs(userCtx, 'can_view_unallocated_data_records').returns(true);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').withArgs('district_admins_access_unallocated_messages').returns(true);

  var proxy = {web: function(req, res) {
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.done();
  }};

  changes(proxy, testReq, testRes);
};

exports['throws a server error if getUserCtx fails'] = function(test) {
  test.expect(4);

  var testGetUserCtxError = 'something went wrong';
  var testReq = 'fake request';
  var testRes = 'fake response';

  var proxy = {web: sinon.spy()};
  sinon.stub(auth, 'getUserCtx').callsArgWith(1, testGetUserCtxError, null);
  sinon.stub(serverUtils, 'serverError', function(err, req, res) {
    test.equals(err, testGetUserCtxError);
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.equals(proxy.web.callCount, 0);
    test.done();
  });

  changes(proxy, testReq, testRes);
};

exports['doesn\'t accept no filter param - #2004'] = function(test) {
  test.expect(5);

  var testReq = { query: {} };
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';
  var proxy = { web: sinon.spy() };

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'some random facility');
  var errorSpy = sinon.spy(console, 'error');

  sinon.stub(serverUtils, 'error', function(err, req, res) {
    test.ok(errorSpy.firstCall.args[0].indexOf('restricted filter:') > 0);
    test.equals(err.code, 403);
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.equals(proxy.web.callCount, 0);
    test.done();
  });

  changes(proxy, testReq, testRes);
};

exports['doesn\'t accept unknown filters'] = function(test) {
  test.expect(5);

  var testReq = {query: {filter: 'naughtybadtimefilter'}};
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';
  var proxy = {web: sinon.spy()};

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'some random facility');
  var errorSpy = sinon.spy(console, 'error');

  sinon.stub(serverUtils, 'error', function(err, req, res) {
    test.ok(errorSpy.firstCall.args[0].indexOf('restricted filter:') > 0);
    test.equals(err.code, 403);
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.equals(proxy.web.callCount, 0);
    test.done();
  });

  changes(proxy, testReq, testRes);
};

exports['doesn\'t accept incorrect facilityId based on the given user'] = function(test) {
  test.expect(5);

  var testReq = {query: {filter: 'medic/doc_by_place', id: 'incorrectFacilityId'}};
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';
  var proxy = {web: sinon.spy()};

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(false);
  var errorSpy = sinon.spy(console, 'error');

  sinon.stub(serverUtils, 'error', function(err, req, res) {
    test.ok(errorSpy.firstCall.args[0].indexOf('restricted filter params') > 0);
    test.equals(err.code, 403);
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.equals(proxy.web.callCount, 0);
    test.done();
  });

  changes(proxy, testReq, testRes);
};

exports['doesn\'t allow unallocated message viewing without correct permission'] = function(test) {
  test.expect(5);

  var testReq = {
    query: {
      filter: 'medic/doc_by_place',
      id: 'facilityId',
      unassigned: 'true'
    },
  };
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';
  var proxy = {web: sinon.spy()};

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  var hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
  hasAllPermissions.withArgs(userCtx, 'can_access_directly').returns(false);
  hasAllPermissions.withArgs(userCtx, 'can_view_unallocated_data_records').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').withArgs('district_admins_access_unallocated_messages').returns(true);
  var errorSpy = sinon.spy(console, 'error');

  sinon.stub(serverUtils, 'error', function(err, req, res) {
    test.ok(errorSpy.firstCall.args[0].indexOf('restricted filter params') > 0);
    test.equals(err.code, 403);
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.equals(proxy.web.callCount, 0);
    test.done();
  });

  changes(proxy, testReq, testRes);
};

exports['doesn\'t allow you to replicate any doc_ids except the ddoc'] = function(test) {
  test.expect(5);

  var testReq = {
    query: {
      filter: '_doc_ids',
      doc_ids: '["badDocument"]'
  }};
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';
  var proxy = {web: sinon.spy()};

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  var errorSpy = sinon.spy(console, 'error');

  sinon.stub(serverUtils, 'error', function(err, req, res) {
    test.ok(errorSpy.firstCall.args[0].indexOf('restricted filter id: ["badDocument"]') > 0);
    test.equals(err.code, 403);
    test.equals(req, testReq);
    test.equals(res, testRes);
    test.equals(proxy.web.callCount, 0);
    test.done();
  });

  changes(proxy, testReq, testRes);
};
