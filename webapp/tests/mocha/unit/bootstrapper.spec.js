const bootstrapper = require('../../../src/js/bootstrapper'),
      sinon = require('sinon'),
      { expect, assert } = require('chai'),
      pouchDbOptions = {
        local: { auto_compaction: true },
        remote: { skip_setup: true }
      };

let originalDocument;
let originalWindow;
let pouchDb;
let localGet;
let localReplicate;
let localClose;
let registered;
let remoteClose;
let localAllDocs;

describe('bootstrapper', () => {

// ignore "Read Only" jshint error for overwriting `document` and `window`
// jshint -W020
  beforeEach(done => {
    pouchDb = sinon.stub();
    localGet = sinon.stub();
    localReplicate = sinon.stub();
    localClose = sinon.stub();
    remoteClose = sinon.stub();
    localAllDocs = sinon.stub();

    pouchDb.onCall(0).returns({
      get: localGet,
      replicate: { from: localReplicate },
      close: localClose,
      allDocs: localAllDocs
    });
    pouchDb.onCall(1).returns({
      remote: true,
      close: remoteClose
    });
    registered = {};
    pouchDb.fetch = sinon.stub();

    if (typeof document !== 'undefined') {
      originalDocument = document;
    }
    if (typeof window !== 'undefined') {
      originalWindow = window;
    }
    document = { cookie: '' };
    window = {
      location: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '5988',
        pathname: '/medic/_design/medic/_rewrite/#/messages',
        href: 'http://localhost:5988/medic/_design/medic/_rewrite/#/messages'
      },
      navigator: {
        serviceWorker: {
          register: () => Promise.resolve(registered),
        },
      },
      PouchDB: pouchDb
    };

    $ = sinon.stub().returns({
      text: sinon.stub(),
      click: sinon.stub(),
      html: sinon.stub(),
      hide: sinon.stub(),
      show: sinon.stub()
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
    localGet.withArgs('_design/medic-client').returns(Promise.resolve({_id: '_design/medic-client'}));
    localGet.withArgs('settings').returns(Promise.resolve({_id: 'settings', settings: {}}));

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 2);
      assert.equal(localClose.callCount, 1);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(localGet.callCount, 2);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.equal(localGet.args[1][0], 'settings');
      done();
    });
  });

  it('performs initial replication, checking that ddoc exists', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').onCall(0).rejects();
    localGet.withArgs('_design/medic-client').onCall(1).resolves();
    localGet.withArgs('settings').returns(Promise.resolve({_id: 'settings', settings: {}}));

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });

    pouchDb.fetch.resolves({ json: sinon.stub().resolves({ total_docs: 99, warn: false }) });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 2);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(pouchDb.args[1][0], 'http://localhost:5988/medic');
      assert.deepEqual(pouchDb.args[1][1], { skip_setup: true });
      assert.equal(localGet.callCount, 3);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.equal(localGet.args[1][0], '_design/medic-client');
      assert.equal(localReplicate.callCount, 1);
      assert.equal(localReplicate.args[0][0].remote, true);
      assert.deepEqual(localReplicate.args[0][1], {
        live: false,
        retry: false,
        heartbeat: 10000,
        timeout: 600000,
        query_params: { initial_replication: true }
      });
      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      assert.equal(localAllDocs.callCount, 1);
      assert.deepEqual(localAllDocs.args[0], [{ limit: 1 }]);

      assert.equal(pouchDb.fetch.callCount, 1);
      assert.deepEqual(pouchDb.fetch.args[0], ['http://localhost:5988/api/v1/users-info']);
      done();
    });
  });

  it('should perform initial replication with more than 100 docs', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').onCall(0).rejects();
    localGet.withArgs('_design/medic-client').onCall(1).resolves();
    localGet.withArgs('settings').returns(Promise.resolve({_id: 'settings', settings: {}}));

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    pouchDb.fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 2);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(pouchDb.args[1][0], 'http://localhost:5988/medic');
      assert.deepEqual(pouchDb.args[1][1], { skip_setup: true });
      assert.equal(localGet.callCount, 3);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.equal(localGet.args[1][0], '_design/medic-client');
      assert.equal(localReplicate.callCount, 1);
      assert.equal(localReplicate.args[0][0].remote, true);
      assert.deepEqual(localReplicate.args[0][1], {
        live: false,
        retry: false,
        heartbeat: 10000,
        timeout: 600000,
        query_params: { initial_replication: true }
      });
      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      assert.equal(localAllDocs.callCount, 1);
      assert.deepEqual(localAllDocs.args[0], [{ limit: 1 }]);
      assert.equal(pouchDb.fetch.callCount, 1);
      assert.deepEqual(pouchDb.fetch.args[0], ['http://localhost:5988/api/v1/users-info']);
      done();
    });
  });

  it('returns redirect to login error when no userCtx cookie found', done => {
    localGet.withArgs('_design/medic-client').rejects();

    const localReplicateResult = Promise.reject({ status: 401 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    pouchDb.fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 401);
      assert.equal(err.redirect, '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages');
      done();
    });
  });

  it('returns redirect to login error when initial replication returns unauthorized', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').rejects();

    const localReplicateResult = Promise.reject({ status: 401 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    pouchDb.fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 401);
      assert.equal(err.redirect, '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages');
      done();
    });
  });

  it('returns other errors in initial replication', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').rejects();

    const localReplicateResult = Promise.reject({ status: 404 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    pouchDb.fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 404);
      assert.equal(err.redirect, null);
      done();
    });
  });

  it('returns error if ddoc is not found after successful initial replication', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').onCall(0).rejects();

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = sinon.stub();
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    pouchDb.fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    localGet.withArgs('_design/medic-client').onCall(1).rejects();

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.message, 'Initial replication failed');
      assert.equal(localGet.callCount, 2);
      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      done();
    });
  });

  it('error results if service worker fails registration', done => {
    setUserCtxCookie({ name: 'jim' });
    pouchDb.onCall(0).returns({
      get: sinon.stub().resolves(),
      replicate: { from: sinon.stub() },
      close: sinon.stub()
    });

    const failingRegister = sinon.stub().rejects('error');
    window.navigator.serviceWorker.register = failingRegister;
    bootstrapper(pouchDbOptions, err => {
      expect(failingRegister.callCount).to.eq(1);
      expect(err).to.include({ name: 'error' });
      done();
    });
  });
});
