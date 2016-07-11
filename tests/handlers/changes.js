var sinon = require('sinon'),
    testUtils = require('../utils'),
    auth = require('../../auth'),
    config = require('../../config'),
    serverUtils = require('../../server-utils'),
    handler = require('../../handlers/changes'),
    db = require('../../db'),
    changes;

exports.setUp = function(callback) {
  changes = sinon.stub(db.medic, 'changes');
  callback();
};

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
    db.medic.view,
    db.medic.changes
  );
  handler._reset();
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

  handler.request(proxy, testReq, testRes);
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

  handler.request(proxy, testReq, testRes);
};

exports['filters the changes to relevant ones'] = function(test) {
  test.expect(22);

  var userCtx = { name: 'mobile' };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';
  var userId = 'org.couchdb.user:mobile';

  var testReq = {
    on: function() {},
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
  handler.request({}, testReq, testRes);
};

exports['allows unallocated access when it is configured and the user has permission'] = function(test) {
  test.expect(10);

  var testReq = { query: {}, on: function() {} };
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
  handler.request({}, testReq, testRes);
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
    },
    on: function() {}
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
      test.deepEqual(JSON.parse(result), { code: 403, message: 'Forbidden' });
      test.done();
    }
  };
  handler.request({}, testReq, testRes);
};


exports['updates the feed when the doc is updated'] = function(test) {
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
    },
    on: function() {}
  };

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(false);

  // change log
  var changeLog = sinon.stub(db, 'request');

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
  handler.request({}, testReq, testRes);

  // some time later a change happens - call the callback
  changeLog.args[0][1](null, {
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
};

exports['replicates new docs to relevant feeds'] = function(test) {
  test.expect(17);

  var userCtx1 = { name: 'jim' };
  var userCtx2 = { name: 'bob' };
  var newId = 'abc';
  var unchangedId = 'klm';
  var userId1 = 'org.couchdb.user:jim';
  var userId2 = 'org.couchdb.user:bob';

  var testReq = {
    query: {
      since: 1,
      heartbeat: 10000,
      feed: 'longpoll',
      doc_ids: JSON.stringify([ unchangedId ])
    },
    on: function() {}
  };

  sinon.stub(auth, 'getUserCtx')
    .onCall(0).callsArgWith(1, null, userCtx1)
    .onCall(1).callsArgWith(1, null, userCtx2);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  var getFacilityId = sinon.stub(auth, 'getFacilityId');
  getFacilityId.onCall(0).callsArgWith(2, null, 'a');
  getFacilityId.onCall(1).callsArgWith(2, null, 'b');
  sinon.stub(config, 'get').returns(false);

  // individual change logs
  sinon.stub(db, 'request')
    .returns({
      abort: function() {
        // assert that abort is called
        test.equals(true, true);
      }
    })
    .onCall(2).callsArgWith(1, null, {
      results: [
        {
          seq: 4,
          id: newId
        }
      ]
    });

  // the view returns the list of ids the user is allowed to see
  sinon.stub(db.medic, 'view')
    .onCall(0).callsArgWith(3, null, {
      rows: [ { id: unchangedId } ]
    })
    .onCall(1).callsArgWith(3, null, {
      rows: [ { id: unchangedId } ]
    })
    .onCall(2).callsArgWith(3, null, {
      rows: [ { id: unchangedId }, { id: newId } ]
    });

  var testRes1 = {
    type: function() {},
    writeHead: function() {},
    write: function() {},
    end: function() {
      setTimeout(function() { // timeout to make sure nothing else tries to respond
        test.done(new Error('First user should not be told about new doc'));
      });
    }
  };

  var result = '';

  var testRes2 = {
    type: function() {},
    writeHead: function() {},
    write: function(slice) {
      result += slice;
    },
    end: function() {
      setTimeout(function() { // timeout to make sure nothing else tries to respond
        result = JSON.parse(result);
        test.equals(result.results.length, 1);
        test.equals(result.results[0].seq, 4);
        test.equals(result.results[0].id, newId);
        test.equals(db.request.callCount, 3); // once for each user, and then once on the change
        test.deepEqual(db.request.args[0][0].body.doc_ids, [ unchangedId, userId1 ]);
        test.deepEqual(db.request.args[1][0].body.doc_ids, [ unchangedId, userId2 ]);
        test.deepEqual(db.request.args[2][0].body.doc_ids, [ unchangedId, newId, userId2 ]);
        test.equals(db.medic.view.callCount, 3);
        test.equals(db.medic.view.args[0][0], 'medic');
        test.equals(db.medic.view.args[0][1], 'doc_by_place');
        test.equals(db.medic.view.args[0][2].keys.length, 2);
        test.equals(db.medic.view.args[0][2].keys[0], '_all');
        test.equals(db.medic.view.args[0][2].keys[1], 'a');
        test.equals(db.medic.view.args[1][2].keys[1], 'b');
        test.equals(db.medic.view.args[2][2].keys[1], 'b');
        test.done();
      });
    }
  };
  handler.request({}, testReq, testRes1); // first user
  handler.request({}, testReq, testRes2); // second user

  // some time later document is created - call the callback
  changes.args[0][1](null, {
    results: [
      {
        seq: 4,
        id: newId,
        doc: {
          _id: newId,
          type: 'data_record',
          contact: {
            _id: 'zzz',
            parent: {
              _id: 'b'
            }
          }
        }
      }
    ]
  });
};

exports['cleans up when the client connection is closed - #2476'] = function(test) {

  // this can happen if the client internet drops out, the browser is closed, etc
  // https://nodejs.org/api/http.html#http_event_close_2

  test.expect(2);

  var userCtx = { name: 'mobile' };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';

  var testReq = {
    query: {
      since: 1,
      heartbeat: 10000,
      feed: 'longpoll',
      doc_ids: JSON.stringify([ deletedId, unchangedId ])
    },
    on: function(name, eventCb) {
      test.equals(name, 'close');
      // fire the close event handler
      setTimeout(eventCb);
    }
  };

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(config, 'get').returns(false);

  // change log
  sinon.stub(db, 'request').returns({
    abort: function() {
      var feeds = handler._getFeeds();
      test.equals(feeds.length, 0);
      test.done();
    }
  });

  // the view returns the list of ids the user is allowed to see
  sinon.stub(db.medic, 'view').callsArgWith(3, null, {
    rows: [
      { id: unchangedId },
      { id: allowedId }
    ]
  });

  var testRes = {
    type: function() {},
    writeHead: function() {}
  };
  handler.request({}, testReq, testRes);

};
