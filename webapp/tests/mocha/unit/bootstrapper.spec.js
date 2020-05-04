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

let originalDocument;
let originalWindow;
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
    bootstrapper.__set__('fetch', sinon.stub());
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
    sinon.restore();
    done();
  });

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

  it('should initialize replication header with local db id', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);

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
      assert.equal(purger.setOptions.callCount, 1);
      assert.equal(purger.shouldPurge.callCount, 1);
      assert.equal(purger.shouldPurgeMeta.callCount, 1);
      done();
    });
  });

  it('should initialize purger with correct options', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(purger.setOptions.callCount, 1);
      assert.deepEqual(purger.setOptions.args[0], [pouchDbOptions]);
      done();
    });
  });

  it('returns if local db already has client ddoc', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);

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
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'info').resolves('some-info');
    sinon.stub(purger, 'checkpoint').resolves();
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localId.resolves('some random string');

    localAllDocs.resolves({ total_rows: 0 });

    fetch.resolves({ json: sinon.stub().resolves({ total_docs: 99, warn: false }) });

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

      assert.equal(purger.info.callCount, 1);
      assert.equal(purger.checkpoint.callCount, 1);
      assert.deepEqual(purger.checkpoint.args[0], ['some-info']);

      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      assert.equal(localAllDocs.callCount, 1);
      assert.deepEqual(localAllDocs.args[0], [{ limit: 1 }]);

      assert.equal(fetch.callCount, 1);
      assert.deepEqual(fetch.args[0], ['http://localhost:5988/api/v1/users-info', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } }]);
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
    fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });
    localId.resolves('some random string');
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'info').resolves('some-info');
    sinon.stub(purger, 'checkpoint').resolves();
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);

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
      assert.equal(fetch.callCount, 1);
      assert.deepEqual(fetch.args[0], ['http://localhost:5988/api/v1/users-info', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } }]);
      done();
    });
  });

  it('returns redirect to login error when no userCtx cookie found', done => {
    localGet.withArgs('_design/medic-client').rejects();
    sinon.stub(purger, 'setOptions');

    const localReplicateResult = Promise.reject({ status: 401 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 401);
      assert.equal(
        err.redirect,
        '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages'
      );
      done();
    });
  });

  it('returns redirect to login error when initial replication returns unauthorized', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').rejects();
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'info').resolves('some-info');
    sinon.stub(purger, 'checkpoint').resolves();

    const localReplicateResult = Promise.reject({ status: 401 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 401);
      assert.equal(
        err.redirect,
        '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages'
      );
      done();
    });
  });

  it('returns other errors in initial replication', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').rejects();
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'info').resolves('some-info');
    sinon.stub(purger, 'checkpoint').resolves();

    const localReplicateResult = Promise.reject({ status: 404 });
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.status, 404);
      assert.equal(err.redirect, null);
      done();
    });
  });

  it('returns error if ddoc is not found after successful initial replication', done => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);
    sinon.stub(purger, 'info').resolves('some-info');
    sinon.stub(purger, 'checkpoint').resolves();

    localGet.withArgs('_design/medic-client').onCall(0).rejects();
    localGet.withArgs('settings').rejects();

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = sinon.stub();
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });

    localGet.withArgs('_design/medic-client').onCall(1).rejects();

    bootstrapper(pouchDbOptions, err => {
      assert.equal(err.message, 'Initial replication failed');
      assert.equal(localGet.callCount, 4);
      assert.equal(purger.setOptions.callCount, 1);
      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      done();
    });
  });

  it('ignores error if users-info fetch fails', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').onCall(0).rejects();
    localGet.withArgs('_design/medic-client').onCall(1).resolves();
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'info').resolves('some-info');
    sinon.stub(purger, 'checkpoint').resolves();
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localId.resolves('some random string');

    localAllDocs.resolves({ total_rows: 0 });

    fetch.resolves({ json: sinon.stub().resolves({ code: 500, error: 'Server error' }) });

    const log = sinon.stub(console, 'warn');

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);

      assert.equal(log.callCount, 1);
      assert.equal(log.args[0][0], 'Error fetching users-info - ignoring');
      assert.deepEqual(log.args[0][1], { code: 500, error: 'Server error' });

      // purger is called anyway...
      assert.equal(purger.info.callCount, 1);
      assert.equal(fetch.callCount, 1);
      done();
    });

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
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);
    let purgeOn;
    purgeOn = sinon.stub().returns({ on: purgeOn, catch: sinon.stub() }); // eslint-disable-line prefer-const
    sinon.stub(purger, 'purge').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(purger.setOptions.callCount, 1);
      assert.deepEqual(purger.setOptions.args[0], [pouchDbOptions]);
      assert.equal(purger.shouldPurge.callCount, 1);
      assert.equal(purger.purge.callCount, 0);
      done();
    });
  });

  it('should not run purge after initial replication and not needed', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves();
    localGet.withArgs('settings').onCall(0).rejects();
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    sinon.stub(purger, 'info').resolves('some-info');
    sinon.stub(purger, 'checkpoint').resolves();
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);
    let purgeOn;
    purgeOn = sinon.stub().returns({ on: purgeOn, catch: sinon.stub() }); // eslint-disable-line prefer-const
    sinon.stub(purger, 'purge').returns({ on: purgeOn });

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });
    localId.resolves('some random string');

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(localReplicate.callCount, 1);
      assert.equal(localReplicate.args[0][0].remote, true);

      assert.equal(purger.setOptions.callCount, 1);
      assert.equal(purger.shouldPurge.callCount, 1);
      assert.equal(purger.purge.callCount, 0);

      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      done();
    });
  });

  it('should run purge after initial replication when needed', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves();
    localGet.withArgs('settings').onCall(0).rejects();
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'info').resolves('some-info');
    sinon.stub(purger, 'checkpoint').resolves();
    sinon.stub(purger, 'shouldPurge').resolves(true);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);
    sinon.stub(purger, 'purge').returns({ on: purgeOn });

    const localReplicateResult = Promise.resolve();
    localReplicateResult.on = () => {};
    localReplicate.returns(localReplicateResult);

    localAllDocs.resolves({ total_rows: 0 });
    fetch.resolves({ json: sinon.stub().resolves({ total_docs: 2500, warn: false }) });
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

      assert.equal(purger.info.callCount, 1);
      assert.equal(purger.checkpoint.callCount, 1);
      assert.deepEqual(purger.checkpoint.args[0], ['some-info']);
      assert.equal(purger.purge.callCount, 1);

      assert.equal(localClose.callCount, 1);
      assert.equal(remoteClose.callCount, 1);
      done();
    });
  });

  it('should run purge after skipping initial replication when needed', done => {
    setUserCtxCookie({ name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(true);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);
    sinon.stub(purger, 'purge').returns({ on: purgeOn });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(purger.setOptions.callCount, 1);
      assert.deepEqual(purger.setOptions.args[0], [pouchDbOptions]);
      assert.equal(purger.shouldPurge.callCount, 1);
      assert.equal(purger.purge.callCount, 1);
      done();
    });
  });

  it('should catch purge errors', done => {
    setUserCtxCookie( { name: 'jim' });

    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(true);
    sinon.stub(purger, 'purge').returns({ on: purgeOn });
    sinon.stub(purger, 'shouldPurgeMeta').resolves(false);
    purgeOn.onCall(1).rejects({ some: 'err' });

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(purger.setOptions.callCount, 1);
      assert.deepEqual(purger.setOptions.args[0], [pouchDbOptions]);
      assert.equal(purger.shouldPurge.callCount, 1);
      assert.equal(purger.purge.callCount, 1);
      done();
    });
  });

  it('should run meta purge on startup when needed', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(true);
    sinon.stub(purger, 'purgeMeta').resolves();

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(purger.shouldPurgeMeta.callCount, 1);
      assert.deepEqual(purger.shouldPurgeMeta.args[0], [localMetaDb]);
      assert.equal(purger.purgeMeta.callCount, 1);
      assert.deepEqual(purger.purgeMeta.args[0], [localMetaDb]);
      done();
    });
  });

  it('should catch meta purge errors', done => {
    setUserCtxCookie({ name: 'jim' });
    localGet.withArgs('_design/medic-client').resolves({_id: '_design/medic-client'});
    localGet.withArgs('settings').resolves({_id: 'settings', settings: {}});
    localId.resolves('some-randomn-uuid');
    sinon.stub(purger, 'setOptions');
    sinon.stub(purger, 'shouldPurge').resolves(false);
    sinon.stub(purger, 'shouldPurgeMeta').resolves(true);
    sinon.stub(purger, 'purgeMeta').rejects('Im an error');

    bootstrapper(pouchDbOptions, err => {
      assert.equal(null, err);
      assert.equal(purger.shouldPurgeMeta.callCount, 1);
      assert.deepEqual(purger.shouldPurgeMeta.args[0], [localMetaDb]);
      assert.equal(purger.purgeMeta.callCount, 1);
      assert.deepEqual(purger.purgeMeta.args[0], [localMetaDb]);
      done();
    });
  });
});
