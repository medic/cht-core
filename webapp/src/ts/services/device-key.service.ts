import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';

// Key material lives in IndexedDB rather than in a doc, because the private key is a CryptoKey and
// not something that can be written as JSON. Nothing here replicates.
const DB_NAME = 'medic-offline-device-keys';
const STORE_NAME = 'keys';
const PERMISSION = 'can_send_offline_data_bundle';

/** IndexedDB reports a failure as a DOMException, or as nothing at all when it is shutting down. */
const asError = (reason: DOMException | null): Error => {
  return reason ?? new Error('IndexedDB request failed');
};

/** ECDSA P-256, the shape the device-key endpoint stores and the api verifies against. */
const SIGNING_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };

/** What this device holds for as long as it stays registered. */
interface StoredKeys {
  /** Non-extractable: it can sign, and nothing can read it back out, not even us. */
  signing_private_key: CryptoKey;
  server_encryption_public_key: string;
}

interface ServerKeys {
  server_encryption_public_key: string;
}

/**
 * Registers this device's offline data bundle signing key with the server, and stores the
 * server's encryption public key beside it, so a user that later goes offline can sign bundles
 * and encrypt them to the server.
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceKeyService {
  /** One registration at a time: init and a sync can both decide to register at the same moment. */
  private registering: Promise<void> | null = null;
  private readonly windowRef: Window | null;

  private readonly username: string | undefined;
  private readonly deviceId: string;
  private readonly recordKey: string;

  constructor(
    private readonly authService: AuthService,
    private readonly dbSyncService: DBSyncService,
    private readonly http: HttpClient,
    private readonly sessionService: SessionService,
    telemetryService: TelemetryService,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    this.windowRef = this.document.defaultView;
    // Registered here rather than injected the other way round: SessionService cannot depend on
    // this service without a cycle, so this service tells it what to do when a session ends. In the
    // constructor rather than init, because the startup session check can end the session first.
    this.sessionService.onSessionEnd(() => this.clearDeviceKeys());
    this.username = this.sessionService.userCtx()?.name;
    this.deviceId = telemetryService.getUniqueDeviceId();
    this.recordKey = `${this.username}:${this.deviceId}`;
  }

  /**
   * Registers straight away rather than waiting for a sync to succeed, so a device that is online
   * now does not depend on sync timing to get its first key. The sync subscription stays as well,
   * for the case where the permission is granted later and the app is not reloaded.
   */
  init() {
    this.dbSyncService.subscribe(status => this.syncStatusChanged(status));
    return this.registerIfPermitted();
  }

  private async syncStatusChanged({ to, from }: { to?: SyncStatus; from?: SyncStatus }) {
    if (to !== SyncStatus.Success || from !== SyncStatus.Success) {
      return;
    }
    await this.registerIfPermitted();
  }

  /**
   * Registers this device if the user may send bundles and it is not registered already.
   *
   * The permission is re-checked on every call rather than once at startup, so a user granted it
   * after login registers without having to reload the app.
   */
  async registerIfPermitted() {
    if (!this.registering) {
      this.registering = this.registerDeviceKeys()
        .catch(err => {
          // Registration must never break startup or syncing: the user keeps working online, and
          // the next successful sync tries again.
          console.error('DeviceKeyService :: Error registering device key', err);
        })
        .finally(() => this.registering = null);
    }

    return this.registering;
  }

  async clearDeviceKeys() {
    await (this.registering || Promise.resolve());
    this.registering = this.write(store => store.delete(this.recordKey))
      .finally(() => this.registering = null);
    await this.registering;
  }

  private async registerDeviceKeys() {
    if (!this.windowRef || !this.username || this.sessionService.isOnlineOnly() ||
      !await this.authService.has(PERMISSION)) {
      return;
    }
    const subtle = this.windowRef.crypto.subtle;

    // Cheapest first: neither the store nor a keypair is worth touching for a device that is
    // already registered to this user.
    const existing = await this.read(this.recordKey);
    if (existing?.server_encryption_public_key) {
      return;
    }

    const pair = await subtle.generateKey(SIGNING_ALGORITHM, false, ['sign', 'verify']);
    const serverKeys = await this.sendPublicKey(subtle, pair.publicKey);
    await this.save(pair.privateKey, serverKeys);
  }

  private async sendPublicKey(subtle: SubtleCrypto, publicKey: CryptoKey): Promise<ServerKeys> {
    // Only the four members the api needs: exportKey also reports how the key may be used here,
    // which says nothing about how the server may use it.
    const { kty, crv, x, y } = await subtle.exportKey('jwk', publicKey);
    const url = `/api/v1/users/${this.username}/devices/${this.deviceId}/keys`;
    const body = { signing_key: { kty, crv, x, y } };

    return lastValueFrom(this.http.post<ServerKeys>(url, body, { responseType: 'json' }));
  }

  private async save(signingPrivateKey: CryptoKey, serverKeys: ServerKeys) {
    const record: StoredKeys = {
      signing_private_key: signingPrivateKey,
      server_encryption_public_key: serverKeys.server_encryption_public_key,
    };
    await this.write(store => store.put(record, this.recordKey));
  }

  // --- IndexedDB ---------------------------------------------------------------------------
  //
  // Small and hand rolled because this is the only thing in the webapp that has to keep something
  // IndexedDB can store but a doc cannot.

  private openDatabase(indexedDB: IDBFactory): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(asError(request.error));
      // Cannot fire while this is the only opener and the version never moves, which is the case
      // today. Here so that bumping the version later cannot turn this into a promise that never
      // settles, which on the write path would hold the registration slot for the whole session.
      request.onblocked = () => reject(new Error('IndexedDB open was blocked'));
    });
  }

  private async read(key: string): Promise<StoredKeys | null> {
    if (!this.windowRef) {
      return null;
    }
    const database = await this.openDatabase(this.windowRef.indexedDB);
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const request = transaction.objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(asError(request.error));
        // A transaction aborted without a request error (another tab forcing a versionchange,
        // storage eviction) fires only this, so without it the promise never settles.
        transaction.onabort = () => reject(asError(transaction.error));
      });
    } finally {
      database.close();
    }
  }

  private async write(operation: (store: IDBObjectStore) => IDBRequest): Promise<void> {
    if (!this.windowRef) {
      return;
    }
    const database = await this.openDatabase(this.windowRef.indexedDB);
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        operation(transaction.objectStore(STORE_NAME));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(asError(transaction.error));
        // Same as the read: an abort with no request error fires only this. A write that never
        // settles would hold the registration slot for the rest of the session.
        transaction.onabort = () => reject(asError(transaction.error));
      });
    } finally {
      database.close();
    }
  }
}
