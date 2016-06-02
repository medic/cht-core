var sinon = require('sinon'),
    testUtils = require('../utils'),
    auth = require('../../auth'),
    config = require('../../config'),
    serverUtils = require('../../server-utils'),
    changes = require('../../handlers/changes'),
    db = require('../../db');

exports.tearDown = function (callback) {
  testUtils.restore(
    auth.getUserCtx,
    auth.hasAllPermissions,
    auth.getFacilityId,
    serverUtils.serverError,
    serverUtils.error,
    config.get,
    console.error,
    db.medic.changes,
    db.medic.view
  );

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

exports['allows access to replicate medic settings'] = function(test) {
  test.expect(2);

  var testReq = {
    query: {
      filter: '_doc_ids',
      doc_ids: '["_design/medic"]'
    }
  };
  var testRes = 'fake response';
  var userCtx = 'fake userCtx';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');

  var proxy = {
    web: function(req, res) {
      test.equals(req, testReq);
      test.equals(res, testRes);
      test.done();
    }
  };

  changes(proxy, testReq, testRes);
};

exports['filters the changes to relevant ones'] = function(test) {
  test.expect(21);

  var testReq = {
    query: {
      since: 1,
      heartbeat: 10000,
      feed: 'longpole',
      doc_ids: ['xxx'] // should be ignored - we can't trust users
    }
  };

  var userCtx = 'fake userCtx';
  var deletedId = 'abc';
  var allowedId = 'def';
  var blockedId = 'hij';
  var unchangedId = 'klm';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(false);

  // change log
  sinon.stub(db.medic, 'changes').callsArgWith(1, null, {
    results: [
      {
        seq: 2,
        id: deletedId,
        deleted: true
      },
      {
        seq: 4,
        id: allowedId
      },
      {
        seq: 10,
        id: blockedId
      }
    ]
  });

  // the view returns the list of ids the user is allowed to see
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { id: unchangedId },
      { id: allowedId }
    ]
  });

  var testRes = {
    json: function(result) {
      test.equals(result.last_seq, 10);
      test.equals(result.results.length, 2);
      test.equals(result.results[0].seq, 2);
      test.equals(result.results[0].id, deletedId);
      test.equals(result.results[0].deleted, true);
      test.equals(result.results[1].seq, 4);
      test.equals(result.results[1].id, allowedId);
      test.equals(db.medic.changes.callCount, 1);
      test.equals(db.medic.changes.args[0][0].since, 1);
      test.equals(db.medic.changes.args[0][0].heartbeat, 10000);
      test.equals(db.medic.changes.args[0][0].feed, 'longpole');
      test.equals(db.medic.changes.args[0][0].doc_ids, undefined);
      test.equals(auth.getFacilityId.callCount, 1);
      test.equals(auth.getFacilityId.args[0][0], testReq);
      test.equals(auth.getFacilityId.args[0][1], userCtx);
      test.equals(db.medic.view.callCount, 1);
      test.equals(db.medic.view.args[0][0], 'medic');
      test.equals(db.medic.view.args[0][1], 'doc_by_place');
      test.equals(db.medic.view.args[0][2].keys.length, 2);
      test.equals(db.medic.view.args[0][2].keys[0], '_all');
      test.equals(db.medic.view.args[0][2].keys[1], 'facilityId');
      test.done();
    }
  };
  changes({}, testReq, testRes);
};

exports['allows unallocated access when its configured and the user has permission'] = function(test) {
  test.expect(11);

  var testReq = { query: {} };

  var userCtx = 'fake userCtx';
  var deletedId = 'abc';
  var allowedId = 'def';
  var blockedId = 'hij';
  var unchangedId = 'klm';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  var hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
  hasAllPermissions.withArgs(userCtx, 'can_access_directly').returns(false);
  hasAllPermissions.withArgs(userCtx, 'can_view_unallocated_data_records').returns(true);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(true);

  // change log
  sinon.stub(db.medic, 'changes').callsArgWith(1, null, {
    results: [
      {
        seq: 2,
        id: deletedId,
        deleted: true
      },
      {
        seq: 4,
        id: allowedId
      },
      {
        seq: 10,
        id: blockedId
      }
    ]
  });

  // the view returns the list of ids the user is allowed to see
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { id: unchangedId },
      { id: allowedId }
    ]
  });

  var testRes = {
    json: function(result) {
      test.equals(result.last_seq, 10);
      test.equals(result.results.length, 2);
      test.equals(result.results[0].seq, 2);
      test.equals(result.results[0].id, deletedId);
      test.equals(result.results[0].deleted, true);
      test.equals(result.results[1].seq, 4);
      test.equals(result.results[1].id, allowedId);
      test.equals(db.medic.view.args[0][2].keys.length, 3);
      test.equals(db.medic.view.args[0][2].keys[0], '_all');
      test.equals(db.medic.view.args[0][2].keys[1], 'facilityId');
      test.equals(db.medic.view.args[0][2].keys[2], '_unassigned');
      test.done();
    }
  };
  changes({}, testReq, testRes);
};
