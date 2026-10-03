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

// Keyed by user and device rather than by a single fixed name: devices are shared, so a phone
// passed on must not hand the next user the first user's key. Records are still cleared wholesale
// when a session ends, so this scopes who a key belongs to, not how long it is kept.
const recordKey = (username: string, deviceId: string) => `${username}:${deviceId}`;
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
 *
 * Registration runs once the startup session check has resolved, and again after any fully successful sync, so a
 * device does not depend on sync timing to get its first key. Registering replaces whatever the
 * server held for this device, so a bundle already sealed under an older key can no longer be
 * decrypted. Retiring a key safely is still an open question.
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
  /** One registration at a time: init and a sync can both decide to register at the same moment. */
  private registering: Promise<void> | null = null;
  /** Latched when the session ends, so a registration still in flight drops its key instead. */
  private ended = false;
  private readonly windowRef: Window | null;

  constructor(
    private readonly authService: AuthService,
    private readonly dbSyncService: DBSyncService,
    private readonly http: HttpClient,
    private readonly sessionService: SessionService,
    private readonly telemetryService: TelemetryService,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    // Through the document view rather than the bare globals, which is how telemetry.service and
    // interaction-tracking.service reach IndexedDB. Web Crypto goes the same way, so the whole
    // service touches one window rather than two. Guarded at the two store entry points, as
    // interaction-tracking does, rather than assumed.
    this.windowRef = this.document.defaultView;
    // Registered here rather than injected the other way round: SessionService cannot depend on
    // this service without a cycle, so this service tells it what to do when a session ends. In the
    // constructor rather than init, because the startup session check can end the session first.
    this.sessionService.onSessionEnd(() => this.endSession());
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
  private async registerIfPermitted() {
    // Whoever asked second joins the attempt already running instead of starting a second one:
    // two registrations in flight would each generate a keypair, and the server could end up
    // keeping one while the device stores the other.
    if (this.registering) {
      return this.registering;
    }

    const attempt: Promise<void> = this.register()
      .catch(err => {
        // Registration must never break startup or syncing: the user keeps working online, and
        // the next successful sync tries again.
        console.error('DeviceKeyService :: Error registering device key', err);
      })
      .finally(() => this.release(attempt));
    this.registering = attempt;
    return this.registering;
  }

  private async register() {
    // The window guard belongs here as well as at the store, since the keypair and the export need
    // it too. Online-only users (admins included) are refused by the server whatever they send, and
    // admins hold every permission. Cheapest first, so the permission read is last.
    if (this.ended || !this.windowRef || this.sessionService.isOnlineOnly() ||
      !await this.authService.has(PERMISSION)) {
      return;
    }
    // Read live rather than kept from startup: a username captured once could be the previous
    // user's by the time a later sync asks.
    await this.registerDeviceKeys(this.sessionService.userCtx().name);
  }

  /**
   * Ends this device's claim on any key material, for good.
   *
   * A registration already in flight would otherwise resolve and save after the clear, putting a
   * usable key back on a device the user has just signed out of. The flag is what stops it, and it
   * is latched here rather than inside `forget()`, because `renew()` forgets too and must still be
   * able to register afterwards.
   */
  private async endSession() {
    // Set before the clear is issued, so a registration that has not yet reached its save drops
    // its key rather than writing it back.
    this.ended = true;
    await this.forget();
  }

  /**
   * Drops this device's key material.
   *
   * Runs when a session ends, so a device the user has signed out of does not keep key material
   * cached. A password change goes to `forgetUser` instead, which takes only that user's record.
   *
   * Best effort, not a guarantee: it only runs for a session ended through the app, and reaching
   * the login page is bounded, so storage that does not answer in time keeps its record. What is
   * left stays usable until that user's password changes, which is the only thing that revokes it
   * server side. Signing out does not.
   */
  private async forget() {
    // Everything, not just this user's record: signing out means no key material stays cached on
    // the device, whoever it belonged to.
    await this.write(store => store.clear());
  }

  /**
   * Drops one user's record and leaves everyone else's alone.
   *
   * What a password change invalidates is that user's keys. Clearing the whole store here would
   * take another user's key off a shared phone, and their device would then re-register and
   * overwrite the server's key for a bundle they may already have handed to a relay.
   */
  private async forgetUser(username: string) {
    const key = recordKey(username, this.telemetryService.getUniqueDeviceId());
    await this.write(store => store.delete(key));
  }

  /**
   * Drops what this device holds and registers again.
   *
   * For a password change made in place: the server drops every device key for the user at that
   * moment, so what is cached here is already dead and a device that kept it would believe it was
   * still registered and never re-register.
   */
  async renew() {
    // Holds the slot for the whole sequence. An attempt already in flight is registering a key the
    // server has just thrown away, and its save would otherwise land after the forget; holding the
    // slot also stops a sync taking it mid-sequence and being joined instead of the fresh one.
    const inFlight = this.registering;
    const username = this.sessionService.userCtx().name;
    const attempt: Promise<void> = (async () => {
      await inFlight;
      await this.forgetUser(username);
      await this.register();
    })()
      .catch(err => console.error('DeviceKeyService :: Error renewing the device key', err))
      .finally(() => this.release(attempt));
    this.registering = attempt;
    return this.registering;
  }

  /**
   * Gives the slot up, but only if this attempt is still the one holding it.
   *
   * An attempt that `renew()` has already superseded must not clear the slot on its way out, or it
   * hands the slot back while the renewal is still running and the next sync starts a second
   * registration alongside it. Two in flight means two keypairs, and the server keeps whichever
   * request arrives last while the device keeps whichever response returns last.
   */
  private release(attempt: Promise<void>) {
    if (this.registering === attempt) {
      this.registering = null;
    }
  }

  private async registerDeviceKeys(username: string) {
    // Cheapest first: neither the store nor a keypair is worth touching for a device that is
    // already registered to this user.
    const deviceId = this.telemetryService.getUniqueDeviceId();
    const existing = await this.read(recordKey(username, deviceId));
    if (existing?.server_encryption_public_key) {
      return;
    }

    const pair = await this.windowRef!.crypto.subtle.generateKey(SIGNING_ALGORITHM, false, ['sign', 'verify']);
    const serverKeys = await this.sendPublicKey(username, deviceId, pair.publicKey);
    await this.save(username, deviceId, pair.privateKey, serverKeys);
  }

  private async sendPublicKey(username: string, deviceId: string, publicKey: CryptoKey): Promise<ServerKeys> {
    // Only the four members the api needs: exportKey also reports how the key may be used here,
    // which says nothing about how the server may use it.
    const { kty, crv, x, y } = await this.windowRef!.crypto.subtle.exportKey('jwk', publicKey);
    const url = `/api/v1/users/${username}/devices/${deviceId}/keys`;
    const body = { signing_key: { kty, crv, x, y } };

    return lastValueFrom(this.http.post<ServerKeys>(url, body, { responseType: 'json' }));
  }

  private async save(
    username: string, deviceId: string, signingPrivateKey: CryptoKey, serverKeys: ServerKeys
  ) {
    // The session ended while this registration was in flight, so there is nobody to keep it for.
    if (this.ended) {
      return;
    }
    const record: StoredKeys = {
      signing_private_key: signingPrivateKey,
      server_encryption_public_key: serverKeys.server_encryption_public_key,
    };
    await this.write(store => store.put(record, recordKey(username, deviceId)));
  }

  // --- IndexedDB ---------------------------------------------------------------------------
  //
  // Small and hand rolled because this is the only thing in the webapp that has to keep something
  // IndexedDB can store but a doc cannot.

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = this.windowRef!.indexedDB.open(DB_NAME, 1);
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
    const database = await this.openDatabase();
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
    const database = await this.openDatabase();
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
