import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expect } from 'chai';
import sinon from 'sinon';

import { AuthService } from '@mm-services/auth.service';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { DeviceKeyService } from '@mm-services/device-key.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';

describe('DeviceKey service', () => {
  const DEVICE_ID = 'device-1';
  const SERVER_KEYS = {
    server_encryption_public_key: 'age1server',
    server_signing_public_key: { kty: 'OKP', crv: 'Ed25519', x: 'server-signing' },
  };

  let service: DeviceKeyService;
  let httpMock: HttpTestingController;
  let authService;
  let dbService;
  let dbSyncService;
  let sessionService;
  let telemetryService;
  let medicDb;
  let syncListener;

  beforeEach(() => {
    medicDb = { get: sinon.stub(), put: sinon.stub().resolves() };
    dbService = { get: sinon.stub().returns(medicDb) };
    authService = { has: sinon.stub().resolves(true) };
    dbSyncService = { subscribe: sinon.stub().callsFake(listener => syncListener = listener) };
    sessionService = { userCtx: sinon.stub().returns({ name: 'chw-user' }) };
    telemetryService = { getUniqueDeviceId: sinon.stub().returns(DEVICE_ID) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: DbService, useValue: dbService },
        { provide: DBSyncService, useValue: dbSyncService },
        { provide: SessionService, useValue: sessionService },
        { provide: TelemetryService, useValue: telemetryService },
      ]
    });

    service = TestBed.inject(DeviceKeyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sinon.restore();
  });

  const notFound = () => {
    const err: any = new Error('missing');
    err.status = 404;
    return err;
  };

  const tick = () => new Promise(resolve => setTimeout(resolve));

  // Key generation is asynchronous (dynamic imports plus the keypairs), so the request is not
  // there on the first tick. Wait for it rather than guessing a delay.
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
    const request = await waitForRequest();
    request.flush(body, opts);
    await done;
    return request;
  };

  it('registers keys with the server after a successful sync', async () => {
    medicDb.get.rejects(notFound());
    service.init();

    const request = await syncSuccessAndFlush();

    expect(request.request.url).to.equal(`/api/v1/users/chw-user/devices/${DEVICE_ID}/keys`);
    expect(request.request.method).to.equal('POST');
    expect(request.request.body.encryption_key).to.match(/^age1/);
    expect(request.request.body.signing_key).to.include({ kty: 'OKP', crv: 'Ed25519' });
    expect(request.request.body.signing_key.x).to.be.a('string');
  });

  it('stores the device keys and the server keys in a local doc', async () => {
    medicDb.get.rejects(notFound());
    service.init();

    await syncSuccessAndFlush();

    expect(medicDb.put.callCount).to.equal(1);
    const doc = medicDb.put.args[0][0];
    expect(doc._id).to.equal('_local/offline-device-keys');
    expect(doc.device_id).to.equal(DEVICE_ID);
    expect(doc.encryption_private_key).to.match(/^AGE-SECRET-KEY-1/);
    expect(doc.encryption_public_key).to.match(/^age1/);
    expect(doc.signing_private_key).to.be.a('string');
    expect(doc.signing_public_key.crv).to.equal('Ed25519');
    expect(doc.server_encryption_public_key).to.equal(SERVER_KEYS.server_encryption_public_key);
    expect(doc.server_signing_public_key).to.deep.equal(SERVER_KEYS.server_signing_public_key);
  });

  it('does nothing when the sync did not fully succeed', async () => {
    service.init();

    await syncListener({ to: SyncStatus.Success, from: SyncStatus.Required });

    expect(authService.has.callCount).to.equal(0);
    expect(medicDb.put.callCount).to.equal(0);
  });

  it('does nothing when the user does not have the permission', async () => {
    authService.has.resolves(false);
    service.init();

    await syncListener({ to: SyncStatus.Success, from: SyncStatus.Success });

    expect(authService.has.args[0][0]).to.equal('can_send_offline_data_bundle');
    expect(medicDb.put.callCount).to.equal(0);
  });

  it('does not register again once this device is registered', async () => {
    medicDb.get.resolves({
      _id: '_local/offline-device-keys',
      device_id: DEVICE_ID,
      server_encryption_public_key: 'age1server',
    });
    service.init();

    await syncListener({ to: SyncStatus.Success, from: SyncStatus.Success });

    expect(medicDb.put.callCount).to.equal(0);
  });

  it('registers again when the local doc belongs to another device', async () => {
    medicDb.get.resolves({
      _id: '_local/offline-device-keys',
      _rev: '0-1',
      device_id: 'another-device',
      server_encryption_public_key: 'age1server',
    });
    service.init();

    await syncSuccessAndFlush();

    expect(medicDb.put.callCount).to.equal(1);
    expect(medicDb.put.args[0][0]._rev).to.equal('0-1');
    expect(medicDb.put.args[0][0].device_id).to.equal(DEVICE_ID);
  });

  it('does not break syncing when registration fails', async () => {
    medicDb.get.rejects(notFound());
    const consoleError = sinon.stub(console, 'error');
    service.init();

    await syncSuccessAndFlush('', { status: 500, statusText: 'Server Error' });

    expect(medicDb.put.callCount).to.equal(0);
    expect(consoleError.callCount).to.equal(1);
    expect(consoleError.args[0][0]).to.equal('DeviceKeyService :: Error registering device keys');
  });
});
