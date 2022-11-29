const sinon = require('sinon');
const { expect, assert } = require('chai');
const pouchDbOptions = {
  local: { auto_compaction: true },
  remote: { skip_setup: true },
  remote_headers: { 'Accept': 'application/json' }
};
const rewire = require('rewire');
const bootstrapper = rewire('../../../src/js/bootstrapper');
const purger = require('../../../src/js/bootstrapper/purger');
const utils = require('../../../src/js/bootstrapper/utils');

let originalDocument;
let originalWindow;
let originalPerformance;
let pouchDb;
let localGet;
let localReplicate;
let localClose;
let registered;
let remoteClose;
let localAllDocs;
let localId;
let purgeOn;
let localMetaClose;

let localMedicDb;
let remoteMedicDb;
let localMetaDb;

describe('bootstrapper', () => {

  beforeEach(done => {
    pouchDb = sinon.stub();
    localGet = sinon.stub();
    localReplicate = sinon.stub();
    localClose = sinon.stub();
    remoteClose = sinon.stub();
    localAllDocs = sinon.stub();
    localId = sinon.stub().resolves();
    localMetaClose = sinon.stub();

    localMedicDb = {
      get: localGet,
      replicate: { from: localReplicate },
      close: localClose,
      allDocs: localAllDocs,
      id: localId
    };

    remoteMedicDb = {
      remote: true,
      close: remoteClose,
    };

    localMetaDb = {
      close: localMetaClose,
    };

    pouchDb.onCall(0).returns(localMedicDb);
    pouchDb.onCall(1).returns(remoteMedicDb);
    pouchDb.onCall(2).returns(localMetaDb);
    registered = {};

    if (typeof document !== 'undefined') {
      originalDocument = document;
    }
    if (typeof window !== 'undefined') {
      originalWindow = window;
    }
    if (typeof performance !== 'undefined') {
      originalPerformance = performance;
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
      PouchDB: pouchDb,
      startupTimes: {}
    };
    performance = { now: sinon.stub() };

    purgeOn = sinon.stub();
    purgeOn.callsFake(() => {
      const promise = Promise.resolve();
      promise.on = purgeOn;
      return promise;
    });

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
    document = typeof originalDocument === 'undefined' ? undefined : originalDocument;
    window = typeof originalWindow === 'undefined' ? undefined : originalWindow;
    performance = typeof originalPerformance === 'undefined' ? undefined : originalPerformance;
    sinon.restore();
    done();
  });

  const setUserCtxCookie = userCtx => {
    document.cookie = `userCtx=${JSON.stringify(userCtx)};something=true`;
  };
  const wait = time => new Promise(resolve => setTimeout(resolve, time));

  it('does nothing for admins', done => {
    setUserCtxCookie({ name: 'jimbo', roles: [ '_admin' ] });
    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 0);
      done();
    });
  });

  it('should initialize replication header with local db id', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(localId.callCount, 1);
      assert.deepEqual(pouchDbOptions, {
        local: { auto_compaction: true },
        remote: { skip_setup: true },
        remote_headers: {
          'Accept': 'application/json',
          'medic-replication-id': 'some-randomn-uuid'
        }
      });
      assert.equal(utils.setOptions.callCount, 1);
      assert.equal(purger.purgeMain.callCount, 1);
      assert.equal(purger.purgeMeta.callCount, 1);
      done();
    });
  });

  it('should initialize purger with correct options', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(utils.setOptions.callCount, 1);
      assert.deepEqual(utils.setOptions.args[0], [pouchDbOptions]);
      done();
    });
  });

  it('returns if local db already has client ddoc', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 3);
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
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localId.resolves('some random string');

    localAllDocs.resolves({ total_rows: 0 });

    sinon.stub(utils, 'fetchJSON').resolves({ total_docs: 99, warn: false, code: 200 });
    sinon.stub(console, 'warn');

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 3);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(pouchDb.args[1][0], 'http://localhost:5988/medic');
      assert.deepEqual(pouchDb.args[1][1], { skip_setup: true });
      assert.equal(localGet.callCount, 4);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.equal(localGet.args[1][0], 'settings');
      assert.equal(localGet.args[2][0], '_design/medic-client');
      assert.equal(localGet.args[3][0], 'settings');
      assert.equal(localReplicate.callCount, 1);
      assert.equal(localReplicate.args[0][0].remote, true);
      assert.deepEqual(localReplicate.args[0][1], {
        live: false,
        retry: false,
        heartbeat: 10000,
        timeout: 600000,
        query_params: { initial_replication: true },
      });

      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      assert.equal(localAllDocs.callCount, 1);
      assert.deepEqual(localAllDocs.args[0], [{ limit: 1 }]);

      assert.equal(utils.fetchJSON.callCount, 1);
      assert.deepEqual(utils.fetchJSON.args[0][0], '/api/v1/users-info');
      assert.equal(console.warn.callCount, 0);
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
    sinon.stub(utils, 'fetchJSON').resolves({ total_docs: 99, warn: false, code: 200 });
    localId.resolves('some random string');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });
    sinon.stub(console, 'warn');

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 3);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(pouchDb.args[1][0], 'http://localhost:5988/medic');
      assert.deepEqual(pouchDb.args[1][1], { skip_setup: true });
      assert.equal(localGet.callCount, 4);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.equal(localGet.args[1][0], 'settings');
      assert.equal(localGet.args[2][0], '_design/medic-client');
      assert.equal(localGet.args[3][0], 'settings');
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
      assert.equal(utils.fetchJSON.callCount, 1);
      assert.deepEqual(utils.fetchJSON.args[0][0], '/api/v1/users-info');
      assert.equal(console.warn.callCount, 0);
      done();
    });
  });

  it('should redirect to login when no userCtx cookie found', async () => {
    localGet.withArgs('_design/medic-client').rejects();
    sinon.stub(utils, 'setOptions');

    localAllDocs.resolves({ total_rows: 0 });
    sinon.stub(utils, 'fetchJSON').resolves({ total_docs: 2500, warn: false, code: 200 });
    sinon.stub(console, 'warn');

    bootstrapper(pouchDbOptions, () => assert.fail('should not have executed callback'));

    await wait(100);
    assert.equal(console.warn.callCount, 1);
    assert.equal(
      window.location.href,
      '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages'
    );
  });

  it('should redirect to login when initial replication returns unauthorized', async () => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').rejects();
    sinon.stub(utils, 'setOptions');

    const localReplicateResult = new Promise((resolve, reject) => setTimeout(() => reject({ status: 401 })));
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    sinon.stub(utils, 'fetchJSON').resolves({ total_docs: 2500, warn: false, code: 200 });
    sinon.stub(console, 'warn');

    bootstrapper(pouchDbOptions, () => assert.fail('should not have executed callback'));

    await wait(100);
    assert.equal(console.warn.callCount, 1);
    assert.equal(
      window.location.href,
      '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages'
    );
  });

  it('returns other errors in initial replication', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').rejects();
    sinon.stub(utils, 'setOptions');

    const localReplicateResult = Promise.reject({ status: 404 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    sinon.stub(utils, 'fetchJSON').resolves({ total_docs: 2500, warn: false, code: 200 });
    sinon.stub(console, 'warn');

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 404);
      assert.equal(err.redirect, null);
      assert.equal(console.warn.callCount, 0);
      done();
    });
  });

  it('returns error if ddoc is not found after successful initial replication', done => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    localGet.withArgs('_design/medic-client').onCall(0).rejects();
    localGet.withArgs('settings').rejects();

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = sinon.stub();
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    sinon.stub(utils, 'fetchJSON').resolves({ total_docs: 2500, warn: false, code: 200 });
    sinon.stub(console, 'warn');

    localGet.withArgs('_design/medic-client').onCall(1).rejects();

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.message, 'Initial replication failed');
      assert.equal(localGet.callCount, 4);
      assert.equal(utils.setOptions.callCount, 1);
      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      assert.equal(console.warn.callCount, 0);
      done();
    });
  });

  it('ignores error if users-info fetch fails', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').onCall(0).rejects();
    localGet.withArgs('_design/medic-client').onCall(1).resolves();
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localId.resolves('some random string');

    localAllDocs.resolves({ total_rows: 0 });

    sinon.stub(utils, 'fetchJSON').resolves({ code: 500, error: 'Server error' });

    const log = sinon.stub(console, 'warn');

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);

      assert.equal(log.callCount, 1);
      assert.equal(log.args[0][0], 'Error fetching users-info - ignoring');
      assert.deepEqual(log.args[0][1], { code: 500, error: 'Server error' });

      // purger is called anyway...
      assert.equal(utils.fetchJSON.callCount, 1);
      done();
    });

  });

  it('should not ignore the error and redirect to login if the users-info fetch fails with 401', async () => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').onCall(0).rejects();
    localGet.withArgs('_design/medic-client').onCall(1).resolves();
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);
    localId.resolves('some random string');
    localAllDocs.resolves({ total_rows: 0 });
    sinon.stub(utils, 'fetchJSON').resolves({ code: 401, error: 'user is not authenticated' });

    bootstrapper(pouchDbOptions, () => assert.fail('should not have executed callback'));

    await wait(100);
    assert.equal(
      window.location.href,
      '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages'
    );
    assert.equal(utils.fetchJSON.calledOnce, true);
  });

  it('error results if service worker fails registration', done => {
    setUserCtxCookie({ name: 'jim' });
    pouchDb.onCall(0).returns({
      get: sinon.stub().resolves(),
      replicate: { from: sinon.stub() },
      close: sinon.stub(),
      id: sinon.stub().resolves('aaa')
    });

    const failingRegister = sinon.stub().rejects('error');
    window.navigator.serviceWorker.register = failingRegister;
    bootstrapper(pouchDbOptions, err => {
      expect(failingRegister.callCount).to.eq(1);
      expect(err).to.include({ name: 'error' });
      done();
    });
  });

  it('should not run purge after skipping initial replication and not needed', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(utils.setOptions.callCount, 1);
      assert.deepEqual(utils.setOptions.args[0], [pouchDbOptions]);
      assert.equal(purger.purgeMain.callCount, 1);
      done();
    });
  });

  it('should run purge after initial replication', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves();
    localGet.withArgs('settings').onCall(0).rejects();
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    sinon.stub(utils, 'fetchJSON').resolves({ total_docs: 2500, warn: false, code: 200 });
    sinon.stub(console, 'warn');
    localId.resolves('some random string');

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(pouchDb.callCount, 3);
      assert.equal(pouchDb.args[0][0], 'medic-user-jim');
      assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
      assert.equal(pouchDb.args[1][0], 'http://localhost:5988/medic');
      assert.deepEqual(pouchDb.args[1][1], { skip_setup: true });
      assert.equal(localGet.callCount, 4);
      assert.equal(localGet.args[0][0], '_design/medic-client');
      assert.equal(localGet.args[1][0], 'settings');
      assert.equal(localGet.args[2][0], '_design/medic-client');
      assert.equal(localGet.args[3][0], 'settings');
      assert.equal(localReplicate.callCount, 1);
      assert.equal(localReplicate.args[0][0].remote, true);
      assert.deepEqual(localReplicate.args[0][1], {
        live: false,
        retry: false,
        heartbeat: 10000,
        timeout: 600000,
        query_params: { initial_replication: true },
      });

      assert.equal(purger.purgeMain.callCount, 1);
      assert.equal(console.warn.callCount, 0);

      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      done();
    });
  });

  it('should run purge after skipping initial replication', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(utils.setOptions.callCount, 1);
      assert.deepEqual(utils.setOptions.args[0], [pouchDbOptions]);
      assert.equal(purger.purgeMain.callCount, 1);
      done();
    });
  });

  it('should catch purge errors', done => {
    setUserCtxCookie( { name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');

    const purgeErr = sinon.stub();
    purgeErr.callsFake(() => {
      const promise = Promise.reject('Im an error');
      promise.on = purgeErr;
      return promise;
    });
    sinon.stub(purger, 'purgeMain').returns({ on: purgeErr });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(utils.setOptions.callCount, 1);
      assert.deepEqual(utils.setOptions.args[0], [pouchDbOptions]);
      assert.equal(purger.purgeMain.callCount, 1);
      assert.equal(purger.purgeMeta.callCount, 1);
      done();
    });
  });

  it('should run meta purge on startup', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(purger.purgeMain.callCount, 1);
      assert.equal(purger.purgeMeta.callCount, 1);
      done();
    });
  });

  it('should catch meta purge errors', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMain').returns({ on: purgeOn });

    const purgeErr = sinon.stub();
    purgeErr.callsFake(() => {
      const promise = Promise.reject('Im an error');
      promise.on = purgeErr;
      return promise;
    });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeErr });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(purger.purgeMeta.callCount, 1);
      assert.deepEqual(purger.purgeMeta.args[0], [localMetaDb]);
      done();
    });
  });
});
