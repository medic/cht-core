import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { AuthService } from '@mm-services/auth.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { DeviceKeyService } from '@mm-services/device-key.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';

// Real IndexedDB rather than a stub. The point of the change these cover is that the private key
// is a CryptoKey the store keeps as an object, and a stub would not prove it survives the trip.
const DB_NAME = 'medic-offline-device-keys';
const STORE_NAME = 'keys';
const USER = 'chw-user';

const request = <T>(req: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const readRecord = async (key: string): Promise<any> => {
  const database = await openDatabase();
  try {
    return await request(database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key));
  } finally {
    database.close();
  }
};

const writeRecord = async (key: string, record: any): Promise<void> => {
  const database = await openDatabase();
  try {
    await request(database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record, key));
  } finally {
    database.close();
  }
};

const clearRecords = async (): Promise<void> => {
  const database = await openDatabase();
  try {
    await request(database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear());
  } finally {
    database.close();
  }
};

describe('DeviceKey service', () => {
  const DEVICE_ID = 'device-1';
  const SERVER_KEYS = { server_encryption_public_key: 'age1server' };

  let service: DeviceKeyService;
  let httpMock: HttpTestingController;
  let authService;
  let dbSyncService;
  let sessionService;
  let telemetryService;
  let syncListener;
  let sessionEndHandler;

  beforeEach(async () => {
    await clearRecords();
    // Reset, or a test reaches the previous test's service, which clears the same store.
    syncListener = undefined;
    sessionEndHandler = undefined;
    authService = { has: sinon.stub().resolves(true) };
    dbSyncService = { subscribe: sinon.stub().callsFake(listener => syncListener = listener) };
    telemetryService = { getUniqueDeviceId: sinon.stub().returns(DEVICE_ID) };
    sessionService = {
      userCtx: sinon.stub().returns({ name: USER }),
      onSessionEnd: sinon.stub().callsFake(handler => sessionEndHandler = handler),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: DBSyncService, useValue: dbSyncService },
        { provide: SessionService, useValue: sessionService },
        { provide: TelemetryService, useValue: telemetryService },
      ]
    });

    service = TestBed.inject(DeviceKeyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    httpMock.verify();
    sinon.restore();
    await clearRecords();
  });

  const tick = () => new Promise(resolve => setTimeout(resolve));

  // The permission check, the store read and the keypair all resolve before the request goes out,
  // so it is not there on the first tick. Wait for it rather than guessing a delay.
  const waitForRequest = async () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const matches = httpMock.match(() => true);
      if (matches.length) {
        return matches[0];
      }
      await tick();
    }
    throw new Error('No request was made');
  };

  const KEY = `${USER}:${DEVICE_ID}`;

  const syncSuccess = () => syncListener({ to: SyncStatus.Success, from: SyncStatus.Success });

  const flushRegistration = async (body: any = SERVER_KEYS, opts?: any) => {
    const req = await waitForRequest();
    req.flush(body, opts);
    await tick();
    return req;
  };

  /** init now registers straight away, so most tests start by letting that call finish. */
  const initAndFlush = async (body: any = SERVER_KEYS, opts?: any) => {
    const done = service.init();
    const req = await flushRegistration(body, opts);
    await done;
    return req;
  };

  it('registers the signing key with the server as soon as it starts', async () => {
    const req = await initAndFlush();

    expect(req.request.url).to.equal(`/api/v1/users/${USER}/devices/${DEVICE_ID}/keys`);
    expect(req.request.method).to.equal('POST');
    expect(req.request.body.signing_key).to.include({ kty: 'EC', crv: 'P-256' });
    expect(req.request.body.signing_key.x).to.be.a('string');
    expect(req.request.body.signing_key.y).to.be.a('string');
    // only what describes the key, not how this device may use it
    expect(Object.keys(req.request.body.signing_key).sort((a, b) => a.localeCompare(b)))
      .to.deep.equal(['crv', 'kty', 'x', 'y']);
    // the device no longer has an encryption key of its own: nothing is sent back to it
    expect(Object.keys(req.request.body)).to.deep.equal(['signing_key']);
  });

  /** The reason for keeping a CryptoKey rather than key material: nothing can read it back. */
  it('keeps a private key that cannot be read back out', async () => {
    await initAndFlush();

    const record = await readRecord(KEY);
    expect(record.server_encryption_public_key).to.equal(SERVER_KEYS.server_encryption_public_key);
    expect(record.signing_private_key).to.be.an.instanceof(CryptoKey);
    expect(record.signing_private_key.extractable).to.be.false;
    // the user and the device are the record's name, so they are not repeated inside it
    expect(Object.keys(record).sort((a, b) => a.localeCompare(b)))
      .to.deep.equal(['server_encryption_public_key', 'signing_private_key']);

    let exported;
    try {
      await crypto.subtle.exportKey('jwk', record.signing_private_key);
      exported = true;
    } catch {
      exported = false;
    }
    expect(exported, 'the private key must refuse to be exported').to.be.false;
  });

  it('keeps a key that can still sign', async () => {
    const req = await initAndFlush();
    const record = await readRecord(KEY);

    const message = new TextEncoder().encode('an envelope');
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' }, record.signing_private_key, message
    );
    const publicKey = await crypto.subtle.importKey(
      'jwk', req.request.body.signing_key, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    );

    // what the api does with the key it was just sent
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signature, message))
      .to.be.true;
  });

  it('does nothing when the user does not have the permission', async () => {
    authService.has.resolves(false);

    await service.init();

    expect(authService.has.args[0][0]).to.equal('can_send_offline_data_bundle');
    expect(await readRecord(KEY)).to.be.undefined;
  });

  /** What it starts into when the session check has just logged the user out. */
  it('does nothing when there is no signed in user', async () => {
    sessionService.userCtx.returns(undefined);

    await service.init();

    expect(authService.has.called).to.be.false;
    expect(await readRecord(KEY)).to.be.undefined;
  });

  /** The permission can be granted after login, and the app is not reloaded when it is. */
  it('registers on a later successful sync when the permission arrives afterwards', async () => {
    authService.has.resolves(false);
    await service.init();
    expect(await readRecord(KEY)).to.be.undefined;

    authService.has.resolves(true);
    const done = syncSuccess();
    await flushRegistration();
    await done;

    expect((await readRecord(KEY)).signing_private_key).to.be.an.instanceof(CryptoKey);
  });

  it('ignores a sync that did not fully succeed', async () => {
    await initAndFlush();
    authService.has.resetHistory();

    await syncListener({ to: SyncStatus.Success, from: SyncStatus.Required });

    expect(authService.has.callCount).to.equal(0);
  });

  /**
   * A record without the server's key is not a registration. Storing one would satisfy the
   * already-registered check for good, so the device would never register again.
   */
  it('registers again when the stored record has no server key', async () => {
    await initAndFlush({});

    const stored = await readRecord(KEY);
    expect(stored?.server_encryption_public_key).to.be.undefined;

    const done = syncSuccess();
    await flushRegistration();
    await done;

    expect((await readRecord(KEY)).server_encryption_public_key)
      .to.equal(SERVER_KEYS.server_encryption_public_key);
  });

  it('does not register again once this device is registered for this user', async () => {
    await writeRecord(KEY, {
      signing_private_key: 'whatever',
      server_encryption_public_key: 'age1server',
    });

    await service.init();
    await syncSuccess();

    expect((await readRecord(KEY)).signing_private_key).to.equal('whatever');
  });

  /** Phones get handed round. A key belongs to the user it was issued to, not to the device. */
  it('registers again when the stored key belongs to another user', async () => {
    await writeRecord(`someone-else:${DEVICE_ID}`, {
      signing_private_key: 'their-key',
      server_encryption_public_key: 'age1server',
    });

    await initAndFlush();

    expect((await readRecord(KEY)).signing_private_key).to.be.an.instanceof(CryptoKey);
    // the other user's record is theirs to keep until someone signs out on this device
    expect((await readRecord(`someone-else:${DEVICE_ID}`)).signing_private_key).to.equal('their-key');
  });

  /**
   * init and a sync can both decide to register at the same moment. Two attempts would each
   * generate a keypair and register it, and the loser's key is the one the server would keep.
   */
  it('runs one registration at a time', async () => {
    const first = service.init();
    const second = service['registerIfPermitted']();
    const third = syncSuccess();

    const req = await flushRegistration();
    await Promise.all([first, second, third]);

    expect(httpMock.match(() => true)).to.be.empty;
    expect(req.request.url).to.equal(`/api/v1/users/${USER}/devices/${DEVICE_ID}/keys`);
  });

  it('does not break startup when registration fails', async () => {
    const consoleError = sinon.stub(console, 'error');

    await initAndFlush('', { status: 500, statusText: 'Server Error' });

    expect(await readRecord(KEY)).to.be.undefined;
    expect(consoleError.callCount).to.equal(1);
    expect(consoleError.args[0][0]).to.equal('DeviceKeyService :: Error registering device key');
  });

  /**
   * A write that never settles would hold the registration slot for the rest of the session.
   *
   * Aborted AFTER the request succeeded, which is the case only `onabort` reports: a commit-time
   * quota failure or a forced close. An abort while the request is still pending also errors that
   * request, so aborting earlier would pass with the handler removed and prove nothing.
   */
  it('settles when a transaction aborts after its request succeeded', async () => {
    const realTransaction = IDBDatabase.prototype.transaction;
    sinon.stub(IDBDatabase.prototype, 'transaction').callsFake(function (this: IDBDatabase, ...args) {
      const transaction = realTransaction.apply(this, args as never);
      const realObjectStore = transaction.objectStore.bind(transaction);
      transaction.objectStore = (name: string) => {
        const store = realObjectStore(name);
        const realClear = store.clear.bind(store);
        store.clear = () => {
          const request = realClear();
          request.addEventListener('success', () => transaction.abort());
          return request;
        };
        return store;
      };
      return transaction;
    });

    let settled = false;
    try {
      await service['forget']();
    } catch {
      settled = true;
    }

    expect(settled, 'forget() must settle when only abort fires, not hang').to.be.true;
  });

  describe('forgetting the key', () => {
    /**
     * The session service cannot depend on this one without a cycle, so this service hands it the
     * work to run when a session ends. Signing out then clears the keys there and then.
     */
    it('clears the key when the session ends', async () => {
      authService.has.resolves(false);
      await service.init();
      await writeRecord(KEY, { server_encryption_public_key: 'age1' });

      await sessionEndHandler();

      expect(await readRecord(KEY)).to.be.undefined;
    });

    /** The startup session check can end the session before init has run. */
    it('clears the key when the session ends before init', async () => {
      await writeRecord(KEY, { server_encryption_public_key: 'age1' });

      await sessionEndHandler();

      expect(await readRecord(KEY)).to.be.undefined;
    });

    /**
     * The same race `renew()` guards, on the other path. A registration already in flight resolves
     * after the clear and would otherwise save a usable key onto a device the user has just signed
     * out of, which is precisely what this method promises does not happen.
     */
    it('does not let a registration in flight write its key back', async () => {
      service.init();
      const request = await waitForRequest();

      // Not awaited before the flush, so the clear is issued while the registration is in flight.
      const ending = sessionEndHandler();
      request.flush(SERVER_KEYS);
      await ending;

      expect(await readRecord(KEY), 'no key material may stay cached after a session ends')
        .to.be.undefined;
    });

    it('keeps the key while the session is still good', async () => {
      await writeRecord(KEY, { server_encryption_public_key: 'age1' });
      authService.has.resolves(false);

      await service.init();
      await tick();

      expect(await readRecord(KEY)).to.not.be.undefined;
    });

    /** Whoever it belonged to: signing out leaves no key material cached on the device. */
    it('removes every record, not just this user\'s', async () => {
      await writeRecord(KEY, { server_encryption_public_key: 'age1server' });
      await writeRecord(`someone-else:${DEVICE_ID}`, { server_encryption_public_key: 'age1other' });

      await service['forget']();

      expect(await readRecord(KEY)).to.be.undefined;
      expect(await readRecord(`someone-else:${DEVICE_ID}`)).to.be.undefined;
    });

    it('does nothing when there is no key to forget', async () => {
      await service['forget']();

      expect(await readRecord(KEY)).to.be.undefined;
    });
  });

  /**
   * A password change drops every device key on the server, so what is cached here is already
   * dead and has to be replaced rather than trusted.
   */
  describe('renewing after a password change', () => {
    /**
     * The registration already in flight is for a key the server has just thrown away. If renew
     * joined it instead of waiting it out, that attempt's save would land after the forget and
     * leave this device holding a key the server does not have, with nothing to make it register
     * again.
     */
    it('does not keep a key from a registration that was in flight when the password changed', async () => {
      const inFlight = service.init();
      const firstRequest = await waitForRequest();

      const renewed = service.renew();
      firstRequest.flush({ server_encryption_public_key: 'age1thrown-away' });
      await inFlight;

      const secondRequest = await waitForRequest();
      secondRequest.flush(SERVER_KEYS);
      await renewed;

      const record = await readRecord(KEY);
      expect(record.server_encryption_public_key).to.equal(SERVER_KEYS.server_encryption_public_key);
    });

    /**
     * A sync landing alongside a renew must still leave the device registered. This does NOT pin
     * the narrow window the comment on `renew()` describes (a sync taking the slot during the
     * forget): that ordering is microtask-racy and the test passes against the broken shape too,
     * which is why the guarantee there is structural rather than test-pinned.
     */
    it('still registers when a sync fires alongside a renew', async () => {
      await writeRecord(KEY, {
        signing_private_key: 'the-old-key',
        server_encryption_public_key: 'age1server',
      });
      await service.init();

      const renewed = service.renew();
      const syncing = syncSuccess();

      await flushRegistration();
      await Promise.all([renewed, syncing]);

      const record = await readRecord(KEY);
      expect(record.server_encryption_public_key).to.equal(SERVER_KEYS.server_encryption_public_key);
      expect(record.signing_private_key).to.be.an.instanceof(CryptoKey);
    });

    /**
     * Phones get shared. A password change invalidates that user's keys and nobody else's, and
     * taking another user's key would make their device re-register and overwrite the server key
     * for a bundle they may already have handed to a relay.
     */
    it('leaves another user\'s key alone', async () => {
      await writeRecord(`someone-else:${DEVICE_ID}`, {
        signing_private_key: 'their-key',
        server_encryption_public_key: 'age1theirs',
      });
      await initAndFlush();

      const renewed = service.renew();
      await flushRegistration();
      await renewed;

      expect((await readRecord(`someone-else:${DEVICE_ID}`)).signing_private_key)
        .to.equal('their-key');
    });

    /**
     * The attempt renew supersedes must not hand the registration slot back as it settles. If it
     * does, a sync landing at that moment starts a second registration beside the renewal: two
     * keypairs, and the key the server keeps need not be the one the device keeps.
     */
    it('does not start a second registration when a sync lands as the superseded attempt settles', async () => {
      const inFlight = service.init();
      const firstRequest = await waitForRequest();

      const renewed = service.renew();
      firstRequest.flush({ server_encryption_public_key: 'age1thrown-away' });
      await inFlight;

      const syncing = syncSuccess();
      (await waitForRequest()).flush(SERVER_KEYS);
      await Promise.all([renewed, syncing]);
      await tick();
      await tick();

      expect(httpMock.match(() => true).length, 'exactly one registration may follow a renew')
        .to.equal(0);
    });

    it('drops the stored key and registers a fresh one', async () => {
      await writeRecord(KEY, {
        signing_private_key: 'the-old-key',
        server_encryption_public_key: 'age1server',
      });
      await service.init();

      const renewed = service.renew();
      await flushRegistration();
      await renewed;

      const record = await readRecord(KEY);
      expect(record.signing_private_key).to.be.an.instanceof(CryptoKey);
      expect(record.server_encryption_public_key).to.equal(SERVER_KEYS.server_encryption_public_key);
    });
  });
});
