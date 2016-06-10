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
    db.request,
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
  test.expect(22);

  var userCtx = { name: 'mobile' };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';
  var userId = 'org.couchdb.user:mobile';

  var testReq = {
    query: {
      since: 1,
      heartbeat: 10000,
      feed: 'longpole',
      doc_ids: JSON.stringify([ deletedId, unchangedId ])
    }
  };

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(false);

  // change log
  sinon.stub(db, 'request').callsArgWith(1, null, {
    results: [
      {
        seq: 2,
        id: deletedId,
        deleted: true
      },
      {
        seq: 4,
        id: allowedId
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

  var result = '';

  var testRes = {
    type: function() {},
    writeHead: function() {},
    write: function(slice) {
      result += slice;
    },
    end: function() {
      setTimeout(function() { // timeout to make sure nothing else tries to respond
        result = JSON.parse(result);
        test.equals(result.results.length, 2);
        test.equals(result.results[0].seq, 2);
        test.equals(result.results[0].id, deletedId);
        test.equals(result.results[0].deleted, true);
        test.equals(result.results[1].seq, 4);
        test.equals(result.results[1].id, allowedId);
        test.equals(db.request.callCount, 1);
        test.equals(db.request.args[0][0].path, '_changes');
        test.deepEqual(db.request.args[0][0].body.doc_ids, [ deletedId, unchangedId, allowedId, userId ]);
        test.equals(db.request.args[0][0].method, 'POST');
        test.equals(db.request.args[0][0].qs.since, 1);
        test.equals(db.request.args[0][0].qs.heartbeat, 10000);
        test.equals(db.request.args[0][0].qs.feed, 'longpole');
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
      });
    }
  };
  changes({}, testReq, testRes);
};

exports['allows unallocated access when it is configured and the user has permission'] = function(test) {
  test.expect(10);

  var testReq = { query: {} };
  var userCtx = { name: 'mobile' };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  var hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
  hasAllPermissions.withArgs(userCtx, 'can_access_directly').returns(false);
  hasAllPermissions.withArgs(userCtx, 'can_view_unallocated_data_records').returns(true);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(true);

  // change log
  sinon.stub(db, 'request').callsArgWith(1, null, {
    results: [
      {
        seq: 2,
        id: deletedId,
        deleted: true
      },
      {
        seq: 4,
        id: allowedId
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

  var result = '';

  var testRes = {
    type: function() {},
    writeHead: function() {},
    write: function(slice) {
      result += slice;
    },
    end: function() {
      result = JSON.parse(result);
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

exports['rejects when user requests undeleted docs they are not allowed to see'] = function(test) {
  test.expect(1);

  var userCtx = { name: 'mobile' };
  var blockedId = 'abc';
  var allowedId = 'xyz';

  var testReq = {
    query: {
      since: 1,
      heartbeat: 10000,
      feed: 'longpole',
      doc_ids: JSON.stringify([ blockedId ])
    }
  };

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(false);

  // change log
  sinon.stub(db, 'request').callsArgWith(1, null, {
    results: [
      {
        seq: 2,
        id: blockedId
      }
    ]
  });

  // the view returns the list of ids the user is allowed to see
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { id: allowedId }
    ]
  });

  var result = '';

  var testRes = {
    type: function() {},
    writeHead: function() {},
    write: function(slice) {
      result += slice;
    },
    end: function() {
      test.deepEqual(JSON.parse(result), { error: 'Forbidden' });
      test.done();
    }
  };
  changes({}, testReq, testRes);
};