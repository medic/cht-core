import { Injectable } from '@angular/core';
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
const RECORD_KEY = 'current';
const PERMISSION = 'can_send_offline_data_bundle';

/** ECDSA P-256, the shape the device-key endpoint stores and the api verifies against. */
const SIGNING_ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' };

export interface PublicKeyJwk {
  kty: string;
  crv: string;
  x: string;
  y: string;
}

/** What this device holds for as long as it stays registered. */
interface StoredKeys {
  device_id: string;
  /** Non-extractable: it can sign, and nothing can read it back out, not even us. */
  signing_private_key: CryptoKey;
  server_encryption_public_key: string;
  updated_date: number;
}

interface ServerKeys {
  server_encryption_public_key: string;
}

/**
 * Registers this device's offline data bundle signing key with the server, and stores the
 * server's encryption public key beside it, so a user that later goes offline can sign bundles
 * and encrypt them to the server.
 *
 * Registration runs after a fully successful sync only. At that point the device has just been
 * in direct contact with the server, so any bundle still sealed under older keys is stale by
 * definition and nothing unsent is lost when the server replaces the device entry.
 *
 * The private key is generated non-extractable and kept as a CryptoKey, so it can sign and can
 * never be read back, by us or by anything with a dev console. That rules out Ed25519, which Web
 * Crypto only offers from Chrome 137 while the webapp still supports far older, and ECDSA on
 * P-256 is the usual stand-in.
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceKeyService {
  constructor(
    private readonly authService: AuthService,
    private readonly dbSyncService: DBSyncService,
    private readonly http: HttpClient,
    private readonly sessionService: SessionService,
    private readonly telemetryService: TelemetryService,
  ) {
  }

  init() {
    this.dbSyncService.subscribe(status => this.syncStatusChanged(status));
  }

  private async syncStatusChanged({ to, from }: { to?: SyncStatus; from?: SyncStatus }) {
    if (to !== SyncStatus.Success || from !== SyncStatus.Success) {
      return;
    }

    // Checked on every sync, not once at startup, so a user granted the permission after login
    // registers without having to reload the app.
    if (!await this.authService.has(PERMISSION)) {
      return;
    }

    try {
      await this.registerDeviceKeys();
    } catch (err) {
      // Key registration must never break syncing: the user keeps working online, and the next
      // successful sync tries again.
      console.error('DeviceKeyService :: Error registering device key', err);
    }
  }

  /**
   * Forgets this device's key material, so the next successful sync provisions a fresh pair.
   *
   * Called when the password changes: the server drops every device key for the user at the same
   * moment, and a device that kept its own copy would believe it was still registered and never
   * re-register, leaving it unable to send.
   */
  async forget() {
    await this.write(store => store.delete(RECORD_KEY));
  }

  private async registerDeviceKeys() {
    // Ordered cheapest first: a database read is not worth doing for a device that is already
    // registered, and neither is generating a keypair.
    const deviceId = this.telemetryService.getUniqueDeviceId();
    const existing = await this.read();
    if (this.isRegistered(existing, deviceId)) {
      return;
    }

    const username = this.sessionService.userCtx().name;
    const pair = await crypto.subtle.generateKey(SIGNING_ALGORITHM, false, ['sign', 'verify']);
    const serverKeys = await this.sendPublicKey(username, deviceId, pair.publicKey);
    await this.save(deviceId, pair.privateKey, serverKeys);
  }

  private isRegistered(keys: StoredKeys | null, deviceId: string): boolean {
    return keys?.device_id === deviceId && !!keys?.server_encryption_public_key;
  }

  private async sendPublicKey(username: string, deviceId: string, publicKey: CryptoKey): Promise<ServerKeys> {
    // Only the four members the api needs: exportKey also reports how the key may be used here,
    // which says nothing about how the server may use it.
    const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', publicKey);
    const url = `/api/v1/users/${username}/devices/${deviceId}/keys`;
    const body = { signing_key: { kty, crv, x, y } as PublicKeyJwk };

    return lastValueFrom(this.http.post<ServerKeys>(url, body, { responseType: 'json' }));
  }

  private async save(deviceId: string, signingPrivateKey: CryptoKey, serverKeys: ServerKeys) {
    const record: StoredKeys = {
      device_id: deviceId,
      signing_private_key: signingPrivateKey,
      ...serverKeys,
      updated_date: Date.now(),
    };
    await this.write(store => store.put(record, RECORD_KEY));
  }

  // --- IndexedDB ---------------------------------------------------------------------------
  //
  // Small and hand rolled because this is the only thing in the webapp that has to keep something
  // IndexedDB can store but a doc cannot.

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async read(): Promise<StoredKeys | null> {
    const database = await this.openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const request = database.transaction(STORE_NAME, 'readonly')
          .objectStore(STORE_NAME)
          .get(RECORD_KEY);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  }

  private async write(operation: (store: IDBObjectStore) => IDBRequest): Promise<void> {
    const database = await this.openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        operation(transaction.objectStore(STORE_NAME));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  }
}
