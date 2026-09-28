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
const RECORD_KEY = 'current';

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

const readRecord = async (): Promise<any> => {
  const database = await openDatabase();
  try {
    return await request(database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(RECORD_KEY));
  } finally {
    database.close();
  }
};

const writeRecord = async (record: any): Promise<void> => {
  const database = await openDatabase();
  try {
    await request(database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record, RECORD_KEY));
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

  beforeEach(async () => {
    await clearRecords();
    authService = { has: sinon.stub().resolves(true) };
    dbSyncService = { subscribe: sinon.stub().callsFake(listener => syncListener = listener) };
    sessionService = { userCtx: sinon.stub().returns({ name: 'chw-user' }) };
    telemetryService = { getUniqueDeviceId: sinon.stub().returns(DEVICE_ID) };

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
    localStorage.removeItem('medic-offline-device-keys-forget');
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

  const syncSuccessAndFlush = async (body: any = SERVER_KEYS, opts?: any) => {
    const done = syncListener({ to: SyncStatus.Success, from: SyncStatus.Success });
    const req = await waitForRequest();
    req.flush(body, opts);
    await done;
    return req;
  };

  it('registers the signing key with the server after a successful sync', async () => {
    service.init();

    const req = await syncSuccessAndFlush();

    expect(req.request.url).to.equal(`/api/v1/users/chw-user/devices/${DEVICE_ID}/keys`);
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
    service.init();

    await syncSuccessAndFlush();

    const record = await readRecord();
    expect(record.user).to.equal('chw-user');
    expect(record.device_id).to.equal(DEVICE_ID);
    expect(record.server_encryption_public_key).to.equal(SERVER_KEYS.server_encryption_public_key);
    expect(record.signing_private_key).to.be.an.instanceof(CryptoKey);
    expect(record.signing_private_key.extractable).to.be.false;

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
    service.init();

    const req = await syncSuccessAndFlush();
    const record = await readRecord();

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

  it('does nothing when the sync did not fully succeed', async () => {
    service.init();

    await syncListener({ to: SyncStatus.Success, from: SyncStatus.Required });

    expect(authService.has.callCount).to.equal(0);
    expect(await readRecord()).to.be.undefined;
  });

  it('does nothing when the user does not have the permission', async () => {
    authService.has.resolves(false);
    service.init();

    await syncListener({ to: SyncStatus.Success, from: SyncStatus.Success });

    expect(authService.has.args[0][0]).to.equal('can_send_offline_data_bundle');
    expect(await readRecord()).to.be.undefined;
  });

  it('does not register again once this device is registered', async () => {
    await writeRecord({
      user: 'chw-user',
      device_id: DEVICE_ID,
      signing_private_key: 'whatever',
      server_encryption_public_key: 'age1server',
    });
    service.init();

    await syncListener({ to: SyncStatus.Success, from: SyncStatus.Success });

    expect((await readRecord()).signing_private_key).to.equal('whatever');
  });

  it('registers again when the stored key belongs to another device', async () => {
    await writeRecord({
      user: 'chw-user',
      device_id: 'another-device',
      signing_private_key: 'whatever',
      server_encryption_public_key: 'age1server',
    });
    service.init();

    await syncSuccessAndFlush();

    const record = await readRecord();
    expect(record.device_id).to.equal(DEVICE_ID);
    expect(record.signing_private_key).to.be.an.instanceof(CryptoKey);
  });

  /** Phones get handed round. A key belongs to the user it was issued to, not to the device. */
  it('registers again when the stored key belongs to another user', async () => {
    await writeRecord({
      user: 'someone-else',
      device_id: DEVICE_ID,
      signing_private_key: 'their-key',
      server_encryption_public_key: 'age1server',
    });
    service.init();

    await syncSuccessAndFlush();

    const record = await readRecord();
    expect(record.user).to.equal('chw-user');
    expect(record.signing_private_key).to.be.an.instanceof(CryptoKey);
  });

  it('does not break syncing when registration fails', async () => {
    const consoleError = sinon.stub(console, 'error');
    service.init();

    await syncSuccessAndFlush('', { status: 500, statusText: 'Server Error' });

    expect(await readRecord()).to.be.undefined;
    expect(consoleError.callCount).to.equal(1);
    expect(consoleError.args[0][0]).to.equal('DeviceKeyService :: Error registering device key');
  });

  describe('forgetting the key', () => {
    /** Signing out only leaves a note: the page is navigating away and cannot wait for storage. */
    it('drops the key at the next start after signing out', async () => {
      await writeRecord({ user: 'chw-user', device_id: DEVICE_ID, server_encryption_public_key: 'age1' });
      service.forgetOnNextStart();

      service.init();
      for (let attempt = 0; attempt < 50 && await readRecord(); attempt++) {
        await tick();
      }

      expect(await readRecord()).to.be.undefined;
      expect(localStorage.getItem('medic-offline-device-keys-forget')).to.be.null;
    });

    it('keeps the key when signing out did not happen', async () => {
      await writeRecord({ user: 'chw-user', device_id: DEVICE_ID, server_encryption_public_key: 'age1' });

      service.init();
      await tick();

      expect(await readRecord()).to.not.be.undefined;
    });

    // A device key does not depend on the password, so a lost phone could keep sending through a
    // relay after the password was changed. The server drops every key; this drops the local copy
    // so the next sync provisions a new one instead of believing it is still registered.
    it('removes the local key material', async () => {
      await writeRecord({ device_id: DEVICE_ID, server_encryption_public_key: 'age1server' });

      await service.forget();

      expect(await readRecord()).to.be.undefined;
    });

    it('does nothing when there is no key to forget', async () => {
      await service.forget();

      expect(await readRecord()).to.be.undefined;
    });
  });
});
