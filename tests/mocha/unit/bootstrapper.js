const assert = require('chai').assert;

var proxyquire = require('proxyquire').noCallThru(),
    bootstrapper = proxyquire('../../../static/js/bootstrapper', {
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

describe('bootstrapper', () => {

  // ignore "Read Only" jshint error for overwriting `document` and `window`
  // jshint -W020
  beforeEach(() => {
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
    $ = sinon.stub().returns({ text:sinon.stub() });
  });

  afterEach(() => {
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
  });
  // jshint +W020

  it('does nothing for admins', (done) => {
    //isAdmin = true;

    bootstrapper(pouchDbOptions, function(err) {
      assert.isNull(err);
      assert.equal(pouchDb.callCount, 0);
      assert.isOk(false);
      done();
    });
  });

  it('returns if local db already has client ddoc', (done) => {
    var localGet = sinon.stub();
    pouchDb.returns({ get: localGet });
    localGet.returns(Promise.resolve());

    bootstrapper(pouchDbOptions, function(err) {
      assert.isNull(err);
      assert.equal(pouchDb.callCount, 1);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(localGet.callCount, 1);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.isOk(false);
      done();
    });
  });

  it('performs initial replication', (done) => {
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
      assert.isNull(err);
      assert.equal(pouchDb.callCount, 2);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(pouchDb.args[1][0], 'http://localhost:5988/medic');
      assert.deepEqual(pouchDb.args[1][1], { skip_setup: true });
      assert.equal(localGet.callCount, 1);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.equal(localReplicate.callCount, 1);
      assert.equal(localReplicate.args[0][0].remote, true);
      assert.deepEqual(localReplicate.args[0][1], {
        live: false,
        retry: false,
        heartbeat: 10000,
        timeout: 600000,
        doc_ids: [ 'org.couchdb.user:jim' ]
      });
      assert.isOk(false);
      done();
    });
  });

  it('handles unauthorized initial replication', (done) => {
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
      assert.equal(err.status, 401);
      assert.equal(err.redirect, '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages');
      done();
    });
  });

  it('handles other errors in initial replication', (done) => {
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
      assert.equal(err.status, 404);
      assert.equal(err.redirect, null);
      done();
    });
  });

});
