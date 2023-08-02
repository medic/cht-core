const sinon = require('sinon');
require('chai').use(require('chai-as-promised'));
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
const initialReplication = require('../../../src/js/bootstrapper/initial-replication');

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

  it('does nothing for admins', async () => {
    setUserCtxCookie({ name: 'jimbo', roles: [ '_admin' ] });
    await bootstrapper(pouchDbOptions);
    assert.equal(pouchDb.callCount, 0);
  });

  it('should initialize replication header with local db id', async () => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(false);

    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    await bootstrapper(pouchDbOptions);

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
    assert.equal(purger.purgeMeta.callCount, 1);
  });

  it('should initialize purger with correct options', async () => {
    setUserCtxCookie({ name: 'jim' });

    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(false);
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    await bootstrapper(pouchDbOptions);

    assert.equal(utils.setOptions.callCount, 1);
    assert.deepEqual(utils.setOptions.args[0], [pouchDbOptions]);
  });

  it('returns if initial replication is not needed', async () => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(false);

    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    await bootstrapper(pouchDbOptions);

    assert.equal(pouchDb.callCount, 3);
    assert.equal(localClose.callCount, 1);
    assert.equal(pouchDb.args[0][0], 'medic-user-jim');
    assert.deepEqual(pouchDb.args[0][1], { auto_compaction: true });
    expect(initialReplication.isReplicationNeeded.callCount).to.equal(1);
    expect(initialReplication.isReplicationNeeded.args).to.deep.equal([[
      localMedicDb,
      { locale: undefined,  name: 'jim' },
    ]]);
  });

  it('performs initial replication', async () => {
    setUserCtxCookie({ name: 'jim' });

    sinon.stub(initialReplication, 'isReplicationNeeded')
      .onCall(0).resolves(true)
      .onCall(1).resolves(false);
    sinon.stub(initialReplication, 'replicate').resolves();

    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    localId.resolves('some random string');

    await bootstrapper(pouchDbOptions);

    expect(initialReplication.isReplicationNeeded.callCount).to.equal(2);
    expect(initialReplication.isReplicationNeeded.args).to.deep.equal([
      [localMedicDb, { locale: undefined, name: 'jim' }],
      [localMedicDb, { locale: undefined, name: 'jim' }],
    ]);
    expect(initialReplication.replicate.callCount).to.equal(1);
    expect(initialReplication.replicate.args).to.deep.equal([[ remoteMedicDb, localMedicDb ]]);
  });

  it('should redirect to login when no userCtx cookie found', async () => {
    sinon.stub(utils, 'setOptions');

    localAllDocs.resolves({ total_rows: 0 });
    sinon.stub(utils, 'fetchJSON').resolves({ total_docs: 2500, warn: false });
    sinon.stub(console, 'warn');

    await bootstrapper(pouchDbOptions);

    await wait(100);
    assert.equal(console.warn.callCount, 1);
    assert.equal(
      window.location.href,
      '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages'
    );
  });

  it('should redirect to login when initial replication returns unauthorized', async () => {
    setUserCtxCookie({ name: 'jim' });

    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(true);
    sinon.stub(initialReplication, 'replicate').rejects({ status: 401 });
    sinon.stub(utils, 'setOptions');

    await bootstrapper(pouchDbOptions);

    await wait(100);
    assert.equal(
      window.location.href,
      '/medic/login?redirect=http%3A%2F%2Flocalhost%3A5988%2Fmedic%2F_design%2Fmedic%2F_rewrite%2F%23%2Fmessages'
    );
  });

  it('returns other errors in initial replication', async () => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(true);
    sinon.stub(utils, 'setOptions');

    sinon.stub(initialReplication, 'replicate').rejects(new Error('message'));

    await expect(bootstrapper(pouchDbOptions)).to.be.rejectedWith(Error, 'message');
  });

  it('returns error if initial replication is still needed', async () => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(true);
    sinon.stub(initialReplication, 'replicate').resolves();

    await expect(bootstrapper(pouchDbOptions)).to.be.rejectedWith(Error, 'Initial replication failed');

    assert.equal(localClose.callCount, 1);
    assert.equal(remoteClose.callCount, 1);
    assert.equal(utils.setOptions.callCount, 1);
    expect(initialReplication.isReplicationNeeded.callCount).to.equal(2);
  });

  it('error results if service worker fails registration', async () => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(false);

    const failingRegister = sinon.stub().rejects(new Error('redundant'));
    window.navigator.serviceWorker.register = failingRegister;

    await expect(bootstrapper(pouchDbOptions)).to.be.rejectedWith(Error, 'redundant');
  });

  it('should run meta purge on startup', async () => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(false);
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeOn });

    await bootstrapper(pouchDbOptions);

    assert.equal(purger.purgeMeta.callCount, 1);
  });

  it('should catch meta purge errors', async () => {
    setUserCtxCookie({ name: 'jim' });
    sinon.stub(initialReplication, 'isReplicationNeeded').resolves(false);
    localId.resolves('some-randomn-uuid');
    sinon.stub(utils, 'setOptions');

    const purgeErr = sinon.stub();
    purgeErr.callsFake(() => {
      const promise = Promise.reject('Im an error');
      promise.on = purgeErr;
      return promise;
    });
    sinon.stub(purger, 'purgeMeta').returns({ on: purgeErr });

    await bootstrapper(pouchDbOptions);

    assert.equal(purger.purgeMeta.callCount, 1);
    assert.deepEqual(purger.purgeMeta.args[0], [localMetaDb]);
  });
});
