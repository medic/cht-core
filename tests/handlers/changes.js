var sinon = require('sinon'),
    testUtils = require('../utils'),
    auth = require('../../auth'),
    config = require('../../config'),
    serverUtils = require('../../server-utils'),
    handler = require('../../handlers/changes'),
    db = require('../../db'),
    DDOC_ID = '_design/medic-client',
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
    auth.getContactId,
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

  var testReq = { query:{} };
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
  test.expect(28);

  var userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';
  var subjectId = 'zyx';
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
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
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

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: subjectId }
    ]
  });
  // returns the list of doc ids the user is allowed to see
  db.medic.view.onCall(1).callsArgWith(3, null, {
    rows: [
      { id: unchangedId, key: 'subjectId', value: { submitter: 'contactId' } },
      { id: allowedId, key: 'subjectId', value: { submitter: 'contactId' } }
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
        test.deepEqual(db.request.args[0][0].body.doc_ids.sort(), [ deletedId, unchangedId, userId, allowedId, DDOC_ID ].sort());
        test.equals(db.request.args[0][0].method, 'POST');
        test.equals(db.request.args[0][0].qs.since, 1);
        test.equals(db.request.args[0][0].qs.heartbeat, 10000);
        test.equals(db.request.args[0][0].qs.feed, 'longpole');
        test.equals(auth.getFacilityId.callCount, 1);
        test.equals(auth.getFacilityId.args[0][0], testReq);
        test.equals(auth.getFacilityId.args[0][1], userCtx);
        test.equals(auth.getContactId.callCount, 1);
        test.equals(auth.getContactId.args[0][0], userCtx);
        test.equals(db.medic.view.callCount, 2);
        test.equals(db.medic.view.args[0][0], 'medic');
        test.equals(db.medic.view.args[0][1], 'contacts_by_depth');
        test.equals(db.medic.view.args[0][2].keys.length, 1);
        test.equals(db.medic.view.args[0][2].keys[0][0], 'facilityId');
        test.equals(db.medic.view.args[1][0], 'medic');
        test.equals(db.medic.view.args[1][1], 'docs_by_replication_key');
        test.equals(db.medic.view.args[1][2].keys.length, 2);
        test.equals(db.medic.view.args[1][2].keys[0], subjectId);
        test.equals(db.medic.view.args[1][2].keys[1], '_all');
        test.done();
      });
    }
  };
  handler.request({}, testReq, testRes);
};

exports['allows unallocated access when it is configured and the user has permission'] = function(test) {
  test.expect(10);

  var testReq = { query: {}, on: function() {} };
  var userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';
  var subjectId = 'zyx';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  var hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
  hasAllPermissions.withArgs(userCtx, 'can_access_directly').returns(false);
  hasAllPermissions.withArgs(userCtx, 'can_view_unallocated_data_records').returns(true);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
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

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: subjectId }
    ]
  });
  // returns the list of doc ids the user is allowed to see
  db.medic.view.onCall(1).callsArgWith(3, null, {
    rows: [
      { id: unchangedId, key: 'subjectId', value: { submitter: 'contactId' } },
      { id: allowedId, key: 'subjectId', value: { submitter: 'contactId' } }
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
      test.equals(db.medic.view.args[1][2].keys.length, 3);
      test.equals(db.medic.view.args[1][2].keys[0], subjectId);
      test.equals(db.medic.view.args[1][2].keys[1], '_all');
      test.equals(db.medic.view.args[1][2].keys[2], '_unassigned');
      test.done();
    }
  };
  handler.request({}, testReq, testRes);
};

exports['respects replication depth when it is configured and the user has permission'] = function(test) {
  test.expect(6);

  var testReq = { query: {}, on: function() {} };
  var userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';
  var subjectId = 'zyx';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  var hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
  hasAllPermissions.withArgs(userCtx, 'can_access_directly').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
  var get = sinon.stub(config, 'get');
  get.onCall(0).returns([ { role: 'district_admin', depth: 1 } ]);
  get.onCall(1).returns(false);

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

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: subjectId }
    ]
  });
  // returns the list of doc ids the user is allowed to see
  db.medic.view.onCall(1).callsArgWith(3, null, {
    rows: [
      { id: unchangedId, key: 'subjectId', value: { submitter: 'contactId' } },
      { id: allowedId, key: 'subjectId', value: { submitter: 'contactId' } }
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
      test.equals(get.callCount, 2);
      test.equals(get.args[0][0], 'replication_depth');
      test.equals(get.args[1][0], 'district_admins_access_unallocated_messages');
      test.equals(db.medic.view.args[0][2].keys.length, 2);
      test.deepEqual(db.medic.view.args[0][2].keys[0], [ 'facilityId', 0 ]);
      test.deepEqual(db.medic.view.args[0][2].keys[1], [ 'facilityId', 1 ]);
      test.done();
    }
  };
  handler.request({}, testReq, testRes);
};

exports['does not return reports about you or your place by someone above you in the hierarchy'] = function(test) {
  test.expect(2);

  var testReq = { query: {}, on: function() {} };
  var userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
  var allowedId = 'def';
  var unpermittedId = 'klm';
  var facilityId = 'zyx';
  var contactId = 'wsa';

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  var hasAllPermissions = sinon.stub(auth, 'hasAllPermissions');
  hasAllPermissions.withArgs(userCtx, 'can_access_directly').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, facilityId);
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, contactId);
  var get = sinon.stub(config, 'get');
  get.onCall(0).returns([ { role: 'district_admin', depth: 1 } ]);
  get.onCall(1).returns(false);

  // change log
  sinon.stub(db, 'request').callsArgWith(1, null, {
    results: [
      {
        seq: 2,
        id: unpermittedId
      },
      {
        seq: 4,
        id: allowedId
      }
    ]
  });

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: facilityId }, // their place
      { id: contactId } // their contact
    ]
  });
  // returns the list of doc ids the user is allowed to see
  db.medic.view.onCall(1).callsArgWith(3, null, {
    rows: [
      // submitted by your boss about your facility - don't show
      { id: unpermittedId, key: facilityId, value: { submitter: 'yourboss' } },

      // submitted by you about your facility - show
      { id: allowedId, key: facilityId, value: { submitter: contactId } }
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
      test.equals(result.results.length, 1);
      test.equals(result.results[0].id, allowedId);
      test.done();
    }
  };
  handler.request({}, testReq, testRes);
};

exports['filters out undeleted docs they are not allowed to see'] = function(test) {
  test.expect(2);

  var userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
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
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
  sinon.stub(config, 'get').returns(false);

  // change log
  sinon.stub(db, 'request').callsArgWith(1, null, {
    results: [
      {
        seq: 2,
        id: blockedId
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
      { id: allowedId, key: 'subjectId', value: { submitter: 'contactId' } }
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
      test.equals(result.results.length, 1);
      test.equals(result.results[0].id, allowedId);
      test.done();
    }
  };
  handler.request({}, testReq, testRes);
};

exports['updates the feed when the doc is updated'] = function(test) {
  test.expect(17);

  var userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';
  var subjectId = 'zyx';
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
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
  sinon.stub(config, 'get').returns(false);

  // change log
  var changeLog = sinon.stub(db, 'request');

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: subjectId }
    ]
  });
  // returns the list of doc ids the user is allowed to see
  db.medic.view.onCall(1).callsArgWith(3, null, {
    rows: [
      { id: unchangedId, key: 'subjectId', value: { submitter: 'contactId' } },
      { id: allowedId, key: 'subjectId', value: { submitter: 'contactId' } }
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
        test.deepEqual(db.request.args[0][0].body.doc_ids.sort(), [ deletedId, unchangedId, userId, allowedId, DDOC_ID ].sort());
        test.equals(db.request.args[0][0].method, 'POST');
        test.equals(db.request.args[0][0].qs.since, 1);
        test.equals(db.request.args[0][0].qs.heartbeat, 10000);
        test.equals(db.request.args[0][0].qs.feed, 'longpole');
        test.equals(auth.getFacilityId.callCount, 1);
        test.equals(auth.getFacilityId.args[0][0], testReq);
        test.equals(auth.getFacilityId.args[0][1], userCtx);
        test.equals(db.medic.view.callCount, 2);
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
  test.expect(10);

  var userCtx1 = { name: 'jim', roles: [ 'district_admin' ] };
  var userCtx2 = { name: 'bob', roles: [ 'district_admin' ] };
  var newId = 'abc';
  var unchangedId = 'klm';
  var subjectId = 'zya';
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
  getFacilityId.onCall(2).callsArgWith(2, null, 'b');
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
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

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the first user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: 'not-applicable' }
    ]
  });
  // returns the list of doc ids the first user is allowed to see
  db.medic.view.onCall(1).callsArgWith(3, null, {
    rows: [
      { id: unchangedId, key: 'subjectId', value: { submitter: 'contactId' } }
    ]
  });
  // returns the list of subjects the second user is allowed to see
  db.medic.view.onCall(2).callsArgWith(3, null, {
    rows: [
      { id: subjectId }
    ]
  });
  // returns the list of doc ids the second user is allowed to see
  db.medic.view.onCall(3).callsArgWith(3, null, {
    rows: [
      { id: unchangedId, key: 'subjectId', value: { submitter: 'contactId' } }
    ]
  });
  // returns the list of subjects the second user is allowed to see
  db.medic.view.onCall(4).callsArgWith(3, null, {
    rows: [
      { id: subjectId }
    ]
  });
  // returns the list of doc ids the second user is allowed to see
  db.medic.view.onCall(5).callsArgWith(3, null, {
    rows: [
      { id: unchangedId, key: 'subjectId', value: { submitter: 'contactId' } },
      { id: newId, key: 'subjectId', value: { submitter: 'contactId' } }
    ]
  });

  var testRes1 = {
    type: function() {},
    writeHead: function() {},
    write: function() {},
    end: function() {
      test.done(new Error('First user should not be told about new doc'));
    },
    setHeader: function() {},
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
        test.deepEqual(db.request.args[0][0].body.doc_ids.sort(), [ unchangedId, userId1, DDOC_ID ].sort());
        test.deepEqual(db.request.args[1][0].body.doc_ids.sort(), [ unchangedId, userId2, DDOC_ID ].sort());
        test.deepEqual(db.request.args[2][0].body.doc_ids.sort(), [ unchangedId, userId2, newId, DDOC_ID ].sort());
        test.equals(db.medic.view.callCount, 6);
        test.done();
      });
    },
    setHeader: function() {},
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
          form: 'V',
          type: 'data_record',
          patient_id: subjectId
        }
      }
    ]
  });
};

exports['cleans up when the client connection is closed - #2476'] = function(test) {

  // this can happen if the client internet drops out, the browser is closed, etc
  // https://nodejs.org/api/http.html#http_event_close_2

  test.expect(2);

  var userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
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
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
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
      { id: unchangedId, key: 'subjectId', value: { submitter: 'contactId' } },
      { id: allowedId, key: 'subjectId', value: { submitter: 'contactId' } }
    ]
  });

  var testRes = {
    type: function() {},
    writeHead: function() {},
    setHeader: function() {},
  };
  handler.request({}, testReq, testRes);

};
