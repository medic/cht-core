var sinon = require('sinon').sandbox.create(),
    auth = require('../../../auth'),
    config = require('../../../config'),
    handler = require('../../../handlers/changes'),
    db = require('../../../db'),
    DDOC_ID = '_design/medic-client',
    changes;

exports.setUp = function(callback) {
  changes = sinon.stub(db.medic, 'changes');
  callback();
};

exports.tearDown = function (callback) {
  sinon.restore();
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

exports['filters the changes to relevant ones'] = function(test) {
  test.expect(29);

  var userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
  var deletedId = 'abc';
  var allowedId = 'def';
  var unchangedId = 'klm';
  var subjectId = 'zyx';
  var patientId = '59945';
  var userId = 'org.couchdb.user:mobile';

  var testReq = {
    on: function() {},
    query: {
      since: 1,
      heartbeat: 10000,
      feed: 'not-longpoll',
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
    ],
    last_seq: 5
  });

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: subjectId, value: patientId }
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
        test.equals(db.request.args[0][0].qs.feed, 'not-longpoll');
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
        test.equals(db.medic.view.args[1][2].keys.length, 3);
        test.equals(db.medic.view.args[1][2].keys[0], subjectId);
        test.equals(db.medic.view.args[1][2].keys[1], patientId);
        test.equals(db.medic.view.args[1][2].keys[2], '_all');
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
    ],
    last_seq: 5
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
    ],
    last_seq: 5
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

exports['correctly handles depth of 0'] = function(test) {
  test.expect(2);

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
  get.onCall(0).returns([ { role: 'district_admin', depth: 0 } ]);
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
    ],
    last_seq: 5
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
      test.equals(db.medic.view.args[0][2].keys.length, 1);
      test.deepEqual(db.medic.view.args[0][2].keys[0], [ 'facilityId', 0 ]);
      test.done();
    }
  };
  handler.request({}, testReq, testRes);
};

exports['no configured depth defaults to Ininite depth'] = function(test) {
  test.expect(2);

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
  get.onCall(0).returns();
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
    ],
    last_seq: 5
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
      test.equals(db.medic.view.args[0][2].keys.length, 1);
      test.deepEqual(db.medic.view.args[0][2].keys[0], [ 'facilityId' ]);
      test.done();
    }
  };
  handler.request({}, testReq, testRes);
};

exports['no roles (eg: admin) defaults to Ininite depth'] = function(test) {
  test.expect(2);

  var testReq = { query: {}, on: function() {} };
  var userCtx = { name: 'mobile' };
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
  get.onCall(0).returns([ { role: 'district_admin', depth: 0 } ]);
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
    ],
    last_seq: 5
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
      test.equals(db.medic.view.args[0][2].keys.length, 1);
      test.deepEqual(db.medic.view.args[0][2].keys[0], [ 'facilityId' ]);
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
    ],
    last_seq: 5
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
      feed: 'not-longpoll',
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
    ],
    last_seq: 5
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
      feed: 'longpoll',
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
    setHeader: function() {},
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
        test.equals(db.request.args[0][0].qs.feed, 'longpoll');
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
    ],
    last_seq: 5
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
  var abort1 = sinon.stub();
  var abort2 = sinon.stub();

  // individual change logs
  sinon.stub(db, 'request')
    .onCall(0).returns({ abort: abort1 })
    .onCall(1).returns({ abort: abort2 })
    .onCall(2).callsArgWith(1, null, {
      results: [
        {
          seq: 4,
          id: newId
        }
      ],
      last_seq: 5
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
        test.equals(abort1.callCount, 0);
        test.equals(abort2.callCount, 1); // only the request from the second user should be aborted
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

exports['makes multiple requests when you can see more than 100 docs - #3508'] = test => {
  test.expect(9);

  const userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
  const subjectId = 'zyx';
  const patientId = '59945';
  const allowedDocIds = [...Array(101).keys()].map(id => {
    return { id: '' + id, key: 'subjectId', value: { submitter: 'contactId' } };
  });
  const allowedId1 = '1';
  const allowedId2 = '2';
  const allowedId3 = '3';
  const allowedId4 = '4';

  const testReq = {
    on: () => {},
    query: {
      since: 1,
      heartbeat: 10000,
      feed: 'not-longpoll',
      doc_ids: JSON.stringify([ ])
    }
  };

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
  sinon.stub(config, 'get').returns(false);

  // change log
  sinon.stub(db, 'request')
    .onCall(0).callsArgWith(1, null, {
      results: [
        { seq: 4, id: allowedId1 },
        { seq: 6, id: allowedId2 }
      ],
      last_seq: 6
    })
    .onCall(1).callsArgWith(1, null, {
      results: [
        { seq: 3, id: allowedId3 },
        { seq: 5, id: allowedId4 }
      ],
      last_seq: 5
    });

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: subjectId, value: patientId }
    ]
  });
  // returns the list of doc ids the user is allowed to see
  db.medic.view.onCall(1).callsArgWith(3, null, { rows: allowedDocIds });

  let result = '';

  const testRes = {
    type: () => {},
    writeHead: () => {},
    write: slice => {
      result += slice;
    },
    end: () => {
      setTimeout(() => { // timeout to make sure nothing else tries to respond
        result = JSON.parse(result);
        test.equals(result.results.length, 4);
        // order is important - must be sorted by sequence number
        test.equals(result.results[0].id, allowedId3);
        test.equals(result.results[1].id, allowedId1);
        test.equals(result.results[2].id, allowedId4);
        test.equals(result.results[3].id, allowedId2);
        // must the the largest of the returned sequences
        test.equals(result.last_seq, 6);
        test.equals(db.request.callCount, 2);
        test.equals(db.request.args[0][0].body.doc_ids.length, 100);
        test.equals(db.request.args[1][0].body.doc_ids.length, 3); // two additional keys are added for the ddoc and user settings doc
        test.done();
      });
    }
  };
  handler.request({}, testReq, testRes);
};

exports['test sorting by couchdb 2 sequence style'] = test => {
  test.expect(6);

  const userCtx = { name: 'mobile', roles: [ 'district_admin' ] };
  const subjectId = 'zyx';
  const patientId = '59945';
  const allowedDocIds = [...Array(101).keys()].map(id => {
    return { id: '' + id, key: 'subjectId', value: { submitter: 'contactId' } };
  });
  const allowedId1 = '1';
  const allowedId2 = '2';
  const allowedId3 = '3';
  const allowedId4 = '4';
  const seq3 = '3-g1AAAAG3eJzLYWBg4MhgTmHgz8tPSTV0MDQy1zMAQsMcoARTIkOS_P___7MSGXAqSVIAkkn2IFUZzIkMuUAee5pRqnGiuXkKA2dpXkpqWmZeagpu_Q4g_fGEbEkAqaqH2sIItsXAyMjM2NgUUwdOU_JYgCRDA5ACGjQfn30QlQsgKvcjfGaQZmaUmmZClM8gZhyAmHGfsG0PICrBPmQC22ZqbGRqamyIqSsLAAArcXo';
  const seq4 = '4-g1AAAAIReJyVkE0OgjAQRkcwUVceQU9g-mOpruQm2tI2SLCuXOtN9CZ6E70JFmpCCCFCmkyTdt6bfJMDwDQNFcztWWkcY8JXyB2cu49AgFwURZGloRid3MMkEUoJHbXbOxVy6arc_SxQWQzRVHCuYHaxSpuj1aqbj0t-3-AlSrZakn78oeSvjRSIkIhSNiCFHbsKN3c50b02mURvEB-yD296eNOzzoRMRLRZ98rkHS_veGcC_nR-fGe1gaCaxihhjOI2lX0BhniHaA';
  const seq5 = '5-g1AAAAIreJyVkEsKwjAURZ-toI5cgq5A0sQ0OrI70XyppcaRY92J7kR3ojupaSPUUgotgRd4yTlwbw4A0zRUMLdnpaMkwmyF3Ily9xBwEIuiKLI05KOTW0wkV4rruP29UyGWbordzwKVxWBNOGMKZhertDlarbr5pOT3DV4gudUC9-MPJX9tpEAYx4TQASns2E24ucuJ7rXJSL1BbEgf3vTwpmedCZkYa7Pulck7Xt7x_usFU2aIHOD4eEfVTVA5KMGUkqhNZV-8_o5i';
  const seq6 = '6-g1AAAAHXeJzLYWBg4MhgTmHgz8tPSTV0MDQy1zMAQsMcoARTIkOS_P___7MymBMZc4EC7MmJKSmJqWaYynEakaQAJJPsoaYwgE1JM0o1TjQ3T2HgLM1LSU3LzEtNwa3fAaQ_HqQ_kQG3qgSQqnoUtxoYGZkZG5uS4NY8FiDJ0ACkgAbNx2cfROUCiMr9CJ8ZpJkZpaaZEOUziBkHIGbcJ2zbA4hKsA-ZwLaZGhuZmhobYurKAgCz33kh';

  const testReq = {
    on: () => {},
    query: {
      since: 1,
      heartbeat: 10000,
      feed: 'not-longpoll',
      doc_ids: JSON.stringify([ ])
    }
  };

  sinon.stub(auth, 'getUserCtx').callsArgWith(1, null, userCtx);
  sinon.stub(auth, 'hasAllPermissions').returns(false);
  sinon.stub(auth, 'getFacilityId').callsArgWith(2, null, 'facilityId');
  sinon.stub(auth, 'getContactId').callsArgWith(1, null, 'contactId');
  sinon.stub(config, 'get').returns(false);

  // change log
  sinon.stub(db, 'request')
    .onCall(0).callsArgWith(1, null, {
      results: [
        { seq: seq4, id: allowedId1 },
        { seq: seq6, id: allowedId2 }
      ],
      last_seq: seq6
    })
    .onCall(1).callsArgWith(1, null, {
      results: [
        { seq: seq3, id: allowedId3 },
        { seq: seq5, id: allowedId4 }
      ],
      last_seq: seq5
    });

  sinon.stub(db.medic, 'view');
  // returns the list of subjects the user is allowed to see
  db.medic.view.onCall(0).callsArgWith(3, null, {
    rows: [
      { id: subjectId, value: patientId }
    ]
  });
  // returns the list of doc ids the user is allowed to see
  db.medic.view.onCall(1).callsArgWith(3, null, { rows: allowedDocIds });

  let result = '';

  const testRes = {
    type: () => {},
    writeHead: () => {},
    write: slice => {
      result += slice;
    },
    end: () => {
      setTimeout(() => { // timeout to make sure nothing else tries to respond
        result = JSON.parse(result);
        test.equals(result.results.length, 4);
        // order is important - must be sorted by sequence number
        test.equals(result.results[0].id, allowedId3);
        test.equals(result.results[1].id, allowedId1);
        test.equals(result.results[2].id, allowedId4);
        test.equals(result.results[3].id, allowedId2);
        // must the the largest of the returned sequences
        test.equals(result.last_seq, seq6);
        test.done();
      });
    }
  };
  handler.request({}, testReq, testRes);
};
