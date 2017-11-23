var bootstrapper = require('../../../static/js/bootstrapper'),
    sinon = require('sinon'),
    originalDocument,
    originalWindow,
    pouchDb,
    pouchDbOptions = {
      local: { auto_compaction: true },
      remote: { skip_setup: true }
    };

// ignore "Read Only" jshint error for overwriting `document` and `window`
// jshint -W020
exports.setUp = function(cb) {
  pouchDb = sinon.stub();
  if (typeof document !== 'undefined') {
    originalDocument = document;
  }
  if (typeof window !== 'undefined') {
    originalWindow = window;
  }
  document = { cookie: '' };
  window = {
    location: {
      href: 'http://localhost:5988/medic/_design/medic/_rewrite/#/messages'
    },
    PouchDB: pouchDb
  };
  $ = sinon.stub().returns({ text:sinon.stub() });
  cb();
};

var setUserCtxCookie = function(userCtx) {
  document.cookie = `userCtx=${JSON.stringify(userCtx)};something=true`;
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
  setUserCtxCookie({ name: 'jimbo', roles: [ '_admin' ] });
  bootstrapper(pouchDbOptions, function(err) {
    test.equal(null, err);
    test.equal(pouchDb.callCount, 0);
    test.done();
  });
};

exports['returns if local db already has client ddoc'] = function(test) {
  setUserCtxCookie({ name: 'jim' });
  var localGet = sinon.stub();
  pouchDb.returns({ get: localGet });
  localGet.returns(Promise.resolve());
  bootstrapper(pouchDbOptions, function(err) {
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
  setUserCtxCookie({ name: 'jim' });
  var localGet = sinon.stub();
  var localReplicate = sinon.stub();
  pouchDb.onCall(0).returns({
    get: localGet,
    replicate: { from: localReplicate }
  });
  pouchDb.onCall(1).returns({ remote: true });
  localGet.returns(Promise.reject());
  var localReplicateResult = Promise.resolve();
  localReplicateResult.on = function() {};
  localReplicate.returns(localReplicateResult);
  bootstrapper(pouchDbOptions, function(err) {
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
      timeout: 600000,
      doc_ids: [ 'org.couchdb.user:jim' ]
    });
    test.done();
  });
};

exports['returns redirect to login error when no userCtx cookie found'] = function(test) {
  var localGet = sinon.stub();
  var localReplicate = sinon.stub();
  pouchDb.onCall(0).returns({
    get: localGet,
    replicate: { from: localReplicate }
  });
  pouchDb.onCall(1).returns({ remote: true });
  localGet.returns(Promise.reject());
  var localReplicateResult = Promise.reject({ status: 401 });
  localReplicateResult.on = function() {};
  localReplicate.returns(localReplicateResult);
  bootstrapper(pouchDbOptions, function(err) {
    test.equal(err.status, 401);
    test.equal(err.redirect, '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages');
    test.done();
  });
};

exports['returns redirect to login error when initial replication returns unauthorized'] = function(test) {
  setUserCtxCookie({ name: 'jim' });
  var localGet = sinon.stub();
  var localReplicate = sinon.stub();
  pouchDb.onCall(0).returns({
    get: localGet,
    replicate: { from: localReplicate }
  });
  pouchDb.onCall(1).returns({ remote: true });
  localGet.returns(Promise.reject());
  var localReplicateResult = Promise.reject({ status: 401 });
  localReplicateResult.on = function() {};
  localReplicate.returns(localReplicateResult);
  bootstrapper(pouchDbOptions, function(err) {
    test.equal(err.status, 401);
    test.equal(err.redirect, '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages');
    test.done();
  });
};

exports['returns other errors in initial replication'] = function(test) {
  setUserCtxCookie({ name: 'jim' });
  var localGet = sinon.stub();
  var localReplicate = sinon.stub();
  pouchDb.onCall(0).returns({
    get: localGet,
    replicate: { from: localReplicate }
  });
  pouchDb.onCall(1).returns({ remote: true });
  localGet.returns(Promise.reject());
  var localReplicateResult = Promise.reject({ status: 404 });
  localReplicateResult.on = function() {};
  localReplicate.returns(localReplicateResult);
  bootstrapper(pouchDbOptions, function(err) {
    test.equal(err.status, 404);
    test.equal(err.redirect, null);
    test.done();
  });
};
