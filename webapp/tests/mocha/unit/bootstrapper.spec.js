const bootstrapper = require('../../../src/js/bootstrapper'),
      sinon = require('sinon'),
      assert = require('chai').assert,
      pouchDbOptions = {
        local: { auto_compaction: true },
        remote: { skip_setup: true }
      };

let originalDocument,
    originalWindow,
    pouchDb;

describe('bootstrapper', () => {

// ignore "Read Only" jshint error for overwriting `document` and `window`
// jshint -W020
  beforeEach(done => {
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
    
    $ = sinon.stub().returns({
      text: sinon.stub(),
      html: sinon.stub()
    });

    done();
  });

  afterEach(done => {
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
    done();
  });
// jshint +W020

  const setUserCtxCookie = userCtx => {
    document.cookie = `userCtx=${JSON.stringify(userCtx)};something=true`;
  };

  it('does nothing for admins', done => {
    setUserCtxCookie({ name: 'jimbo', roles: [ '_admin' ] });
    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 0);
      done();
    });
  });

  it('returns if local db already has client ddoc', done => {
    setUserCtxCookie({ name: 'jim' });
    const localGet = sinon.stub().returns(Promise.resolve());
    const localClose = sinon.stub().returns(Promise.resolve());
    pouchDb.returns({ get: localGet, close: localClose });
    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 1);
      assert.equal(localClose.callCount, 1);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(localGet.callCount, 1);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      done();
    });
  });

  it('performs initial replication, checking that ddoc exists', done => {
    setUserCtxCookie({ name: 'jim' });
    const localGet = sinon.stub();
    localGet.onCall(0).rejects();
    localGet.onCall(1).resolves();
    const localClose = sinon.stub().returns(Promise.resolve());
    const remoteClose = sinon.stub().returns(Promise.resolve());
    const localReplicate = sinon.stub();
    pouchDb.onCall(0).returns({
      get: localGet,
      replicate: { from: localReplicate },
      close: localClose
    });
    pouchDb.onCall(1).returns({
      remote: true,
      close: remoteClose
    });
    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);
    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 2);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(pouchDb.args[1][0], 'http://localhost:5988/medic');
      assert.deepEqual(pouchDb.args[1][1], { skip_setup: true });
      assert.equal(localGet.callCount, 2);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.equal(localGet.args[1][0], '_design/medic-client');
      assert.equal(localReplicate.callCount, 1);
      assert.equal(localReplicate.args[0][0].remote, true);
      assert.deepEqual(localReplicate.args[0][1], {
        live: false,
        retry: false,
        heartbeat: 10000,
        timeout: 600000,
      });
      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      done();
    });
  });

  it('returns redirect to login error when no userCtx cookie found', done => {
    const localGet = sinon.stub().returns(Promise.reject());
    const localReplicate = sinon.stub();
    const localClose = sinon.stub().returns(Promise.resolve());
    const remoteClose = sinon.stub().returns(Promise.resolve());
    pouchDb.onCall(0).returns({
      get: localGet,
      replicate: { from: localReplicate },
      close: localClose
    });
    pouchDb.onCall(1).returns({
      remote: true,
      close: remoteClose
    });
    const localReplicateResult = Promise.reject({ status: 401 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);
    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 401);
      assert.equal(err.redirect, '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages');
      done();
    });
  });

  it('returns redirect to login error when initial replication returns unauthorized', done => {
    setUserCtxCookie({ name: 'jim' });
    const localGet = sinon.stub().returns(Promise.reject());
    const localReplicate = sinon.stub();
    const localClose = sinon.stub().returns(Promise.resolve());
    const remoteClose = sinon.stub().returns(Promise.resolve());
    pouchDb.onCall(0).returns({
      get: localGet,
      replicate: { from: localReplicate },
      close: localClose
    });
    pouchDb.onCall(1).returns({
      remote: true,
      close: remoteClose
    });
    const localReplicateResult = Promise.reject({ status: 401 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);
    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 401);
      assert.equal(err.redirect, '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages');
      done();
    });
  });

  it('returns other errors in initial replication', done => {
    setUserCtxCookie({ name: 'jim' });
    const localGet = sinon.stub().returns(Promise.reject());
    const localReplicate = sinon.stub();
    const localClose = sinon.stub().returns(Promise.resolve());
    const remoteClose = sinon.stub().returns(Promise.resolve());
    pouchDb.onCall(0).returns({
      get: localGet,
      replicate: { from: localReplicate },
      close: localClose
    });
    pouchDb.onCall(1).returns({
      remote: true,
      close: remoteClose
    });
    const localReplicateResult = Promise.reject({ status: 404 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);
    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 404);
      assert.equal(err.redirect, null);
      done();
    });
  });

  it('returns error if ddoc is not found after successful initial replication', done => {
    setUserCtxCookie({ name: 'jim' });
    const localGet = sinon.stub().rejects();
    const localReplicate = sinon.stub();
    const localClose = sinon.stub().resolves();
    const remoteClose = sinon.stub().resolves();
    pouchDb.onCall(0).returns({
      get: localGet,
      replicate: { from: localReplicate },
      close: localClose
    });
    pouchDb.onCall(1).returns({
      remote: true,
      close: remoteClose
    });
    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = sinon.stub();
    localReplicate.returns(localReplicateResult);
    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.message, 'Initial replication failed');
      assert.equal(localGet.callCount, 2);
      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      done();
    });
  });

});
