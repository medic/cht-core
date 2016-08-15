var proxyquire = require('proxyquire').noCallThru(),
    bootstrap = proxyquire('../../../static/js/bootstrap', {
      'kujua-utils': {
        isUserAdmin: function() {
          return isAdmin;
        }
      }
    }),
    sinon = require('sinon'),
    originalDocument,
    originalWindow,
    isAdmin,
    pouchDb,
    pouchDbOptions = {
      local: { auto_compaction: true },
      remote: { skip_setup: true }
    };

// ignore "Read Only" jshint error for overwriting `document` and `window`
// jshint -W020
exports.setUp = function(cb) {
  isAdmin = false;
  pouchDb = sinon.stub();
  if (typeof document !== 'undefined') {
    originalDocument = document;
  }
  if (typeof window !== 'undefined') {
    originalWindow = window;
  }
  document = {
    cookie: 'userCtx={"name":"jim"};something=true'
  };
  window = {
    location: {
      href: 'http://localhost:5988/medic/_design/medic/_rewrite/#/messages'
    },
    PouchDB: pouchDb
  };
  cb();
};

exports.tearDown = function(cb) {
  if (typeof originalDocument === 'undefined') {
    document = undefined;
  } else {
    document = originalDocument;
  }
  if (typeof originalWindow === 'undefined') {
    window = undefined;
  } else {
    window = originalWindow;
  }
  cb();
};
// jshint +W020

exports['does nothing for admins'] = function(test) {
  isAdmin = true;
  bootstrap(pouchDbOptions, function(err) {
    test.equal(null, err);
    test.done();
  });
};

exports['returns if local db already has client ddoc'] = function(test) {
  var localGet = sinon.stub();
  pouchDb.returns({ get: localGet });
  localGet.returns(Promise.resolve());
  bootstrap(pouchDbOptions, function(err) {
    test.equal(null, err);
    test.equal(pouchDb.callCount, 1);
    test.equal(pouchDb.args[0][0], 'medic-user-jim');
    test.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
    test.equal(localGet.callCount, 1);
    test.equal(localGet.args[0][0], '_design/medic-client');
    test.done();
  });
};

exports['performs initial replication'] = function(test) {
  var localGet = sinon.stub();
  var localReplicate = sinon.stub();
  pouchDb.onCall(0).returns({
    get: localGet,
    replicate: { from: localReplicate }
  });
  pouchDb.onCall(1).returns({ remote: true });
  localGet.returns(Promise.reject());
  localReplicate.returns(Promise.resolve());
  bootstrap(pouchDbOptions, function(err) {
    test.equal(null, err);
    test.equal(pouchDb.callCount, 2);
    test.equal(pouchDb.args[0][0], 'medic-user-jim');
    test.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
    test.equal(pouchDb.args[1][0], 'http://localhost:5988/medic');
    test.deepEqual(pouchDb.args[1][1], { skip_setup: true });
    test.equal(localGet.callCount, 1);
    test.equal(localGet.args[0][0], '_design/medic-client');
    test.equal(localReplicate.callCount, 1);
    test.equal(localReplicate.args[0][0].remote, true);
    test.deepEqual(localReplicate.args[0][1], {
      live: false,
      retry: false,
      heartbeat: 10000,
      doc_ids: [ 'org.couchdb.user:jim' ]
    });
    test.done();
  });
};

exports['handles unauthorized initial replication'] = function(test) {
  var localGet = sinon.stub();
  var localReplicate = sinon.stub();
  pouchDb.onCall(0).returns({
    get: localGet,
    replicate: { from: localReplicate }
  });
  pouchDb.onCall(1).returns({ remote: true });
  localGet.returns(Promise.reject());
  localReplicate.returns(Promise.reject({ status: 401 }));
  bootstrap(pouchDbOptions, function(err) {
    test.equal(err.status, 401);
    test.equal(err.redirect, '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages');
    test.done();
  });
};

exports['handles other errors in initial replication'] = function(test) {
  var localGet = sinon.stub();
  var localReplicate = sinon.stub();
  pouchDb.onCall(0).returns({
    get: localGet,
    replicate: { from: localReplicate }
  });
  pouchDb.onCall(1).returns({ remote: true });
  localGet.returns(Promise.reject());
  localReplicate.returns(Promise.reject({ status: 404 }));
  bootstrap(pouchDbOptions, function(err) {
    test.equal(err.status, 404);
    test.equal(err.redirect, null);
    test.done();
  });
};
