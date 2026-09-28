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
// Set when signing out and acted on at the next start. Logging out navigates the page away, so
// anything done there has to be synchronous: an IndexedDB open that never calls back would leave
// the user staring at the app they just left.
const FORGET_FLAG = 'medic-offline-device-keys-forget';

/** IndexedDB reports a failure as a DOMException, or as nothing at all when it is shutting down. */
const asError = (reason: DOMException | null): Error => {
  return reason ?? new Error('IndexedDB request failed');
};

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
  /** Devices are shared, and a key belongs to the user it was issued to, not to the phone. */
  user: string;
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
    this.forgetIfSignedOut();
    this.dbSyncService.subscribe(status => this.syncStatusChanged(status));
  }

  /**
   * Notes that this device should drop its key, without doing any of the work.
   *
   * Called while signing out, where the page is already on its way somewhere else.
   */
  forgetOnNextStart() {
    try {
      localStorage.setItem(FORGET_FLAG, 'true');
    } catch (err) {
      // Private browsing and full storage both throw here. A key that outlives its session is
      // worth knowing about, but not worth failing a sign out over.
      console.error('DeviceKeyService :: Error marking the device key to be forgotten', err);
    }
  }

  private forgetIfSignedOut() {
    if (localStorage.getItem(FORGET_FLAG) !== 'true') {
      return;
    }
    this.forget()
      .then(() => localStorage.removeItem(FORGET_FLAG))
      .catch(err => console.error('DeviceKeyService :: Error forgetting the device key', err));
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
    // Cheapest first: neither the store nor a keypair is worth touching for a device that is
    // already registered to this user.
    const username = this.sessionService.userCtx().name;
    const deviceId = this.telemetryService.getUniqueDeviceId();
    const existing = await this.read();
    if (this.isRegistered(existing, username, deviceId)) {
      return;
    }

    const pair = await crypto.subtle.generateKey(SIGNING_ALGORITHM, false, ['sign', 'verify']);
    const serverKeys = await this.sendPublicKey(username, deviceId, pair.publicKey);
    await this.save(username, deviceId, pair.privateKey, serverKeys);
  }

  // The user as well as the device: a phone passed to a colleague would otherwise keep the first
  // user's private key, and the second would never register and never be able to send.
  private isRegistered(keys: StoredKeys | null, username: string, deviceId: string): boolean {
    return keys?.user === username &&
      keys?.device_id === deviceId &&
      !!keys?.server_encryption_public_key;
  }

  private async sendPublicKey(username: string, deviceId: string, publicKey: CryptoKey): Promise<ServerKeys> {
    // Only the four members the api needs: exportKey also reports how the key may be used here,
    // which says nothing about how the server may use it.
    const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', publicKey);
    const url = `/api/v1/users/${username}/devices/${deviceId}/keys`;
    const body = { signing_key: { kty, crv, x, y } as PublicKeyJwk };

    return lastValueFrom(this.http.post<ServerKeys>(url, body, { responseType: 'json' }));
  }

  private async save(
    username: string, deviceId: string, signingPrivateKey: CryptoKey, serverKeys: ServerKeys
  ) {
    const record: StoredKeys = {
      user: username,
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
      request.onerror = () => reject(asError(request.error));
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
        request.onerror = () => reject(asError(request.error));
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
        transaction.onerror = () => reject(asError(transaction.error));
      });
    } finally {
      database.close();
    }
  }
}
