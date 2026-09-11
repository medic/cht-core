import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { SessionService } from '@mm-services/session.service';
import { TelemetryService } from '@mm-services/telemetry.service';

// Keys are kept in a `_local` doc: `_local` docs never replicate, so the device private keys
// stay on the device that generated them.
const LOCAL_DOC_ID = '_local/offline-device-keys';
const PERMISSION = 'can_send_offline_data_bundle';

interface PublicKeyJwk {
  kty: string;
  crv: string;
  x: string;
}

interface DeviceKeys {
  encryption_private_key: string;
  encryption_public_key: string;
  signing_private_key: string;
  signing_public_key: PublicKeyJwk;
}

interface ServerKeys {
  server_encryption_public_key: string;
  server_signing_public_key: PublicKeyJwk;
}

const toBase64Url = (bytes: Uint8Array): string => {
  const binary = Array.from(bytes, byte => String.fromCodePoint(byte)).join('');
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

/**
 * Registers this device's offline data bundle keys with the server, and stores the server's
 * public keys locally, so a user that later goes offline can seal bundles for the server.
 *
 * Registration runs after a fully successful sync only. At that point the device has just been
 * in direct contact with the server, so any bundle still sealed under older keys is stale by
 * definition and nothing unsent is lost when the server replaces the device entry.
 *
 * Ed25519 and X25519 are not available in Web Crypto on the browsers the webapp still supports
 * (Chrome 107), so signing keys come from @noble/curves and encryption keys from age-encryption,
 * both pure JS. Consequence: private keys are raw material, they cannot be non-extractable
 * Web Crypto keys.
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceKeyService {
  constructor(
    private readonly authService: AuthService,
    private readonly dbService: DbService,
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
      console.error('DeviceKeyService :: Error registering device keys', err);
    }
  }

  private async registerDeviceKeys() {
    const deviceId = this.telemetryService.getUniqueDeviceId();
    if (await this.isRegistered(deviceId)) {
      return;
    }

    const deviceKeys = await this.generateDeviceKeys();
    const serverKeys = await this.sendDeviceKeys(deviceId, deviceKeys);
    await this.saveKeys(deviceId, deviceKeys, serverKeys);
  }

  private async isRegistered(deviceId: string): Promise<boolean> {
    const doc = await this.getLocalDoc();
    return doc?.device_id === deviceId && !!doc?.server_encryption_public_key;
  }

  private async generateDeviceKeys(): Promise<DeviceKeys> {
    const [age, { ed25519 }] = await Promise.all([
      import('age-encryption'),
      import('@noble/curves/ed25519.js'),
    ]);

    const identity = await age.generateIdentity();
    const signingPrivateKey = ed25519.utils.randomSecretKey();

    return {
      encryption_private_key: identity,
      encryption_public_key: await age.identityToRecipient(identity),
      signing_private_key: toBase64Url(signingPrivateKey),
      signing_public_key: {
        kty: 'OKP',
        crv: 'Ed25519',
        x: toBase64Url(ed25519.getPublicKey(signingPrivateKey)),
      },
    };
  }

  private async sendDeviceKeys(deviceId: string, deviceKeys: DeviceKeys): Promise<ServerKeys> {
    const username = this.sessionService.userCtx()?.name;
    const url = `/api/v1/users/${username}/devices/${deviceId}/keys`;
    const body = {
      encryption_key: deviceKeys.encryption_public_key,
      signing_key: deviceKeys.signing_public_key,
    };

    return lastValueFrom(this.http.post<ServerKeys>(url, body, { responseType: 'json' }));
  }

  private async getLocalDoc(): Promise<any> {
    try {
      return await this.dbService.get().get(LOCAL_DOC_ID);
    } catch (err: any) {
      if (err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  private async saveKeys(deviceId: string, deviceKeys: DeviceKeys, serverKeys: ServerKeys) {
    const existing = await this.getLocalDoc();
    await this.dbService.get().put({
      _id: LOCAL_DOC_ID,
      _rev: existing?._rev,
      device_id: deviceId,
      ...deviceKeys,
      ...serverKeys,
      updated_date: Date.now(),
    });
  }
}
