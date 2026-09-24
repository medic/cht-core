import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { P2pBundleStoreService, StoredBundle } from '@mm-services/p2p-bundle-store.service';

const PERMISSION = 'can_relay_offline_data_bundle';
const URL = '/api/v1/replication/data-bundle';

// A rejection the server will give again for the same bundle however many times it is offered:
// the signature does not verify, the device is not registered, the payload cannot be decrypted,
// or it is too large to accept. Anything else is worth trying again later.
const PERMANENT = [400, 413];

/**
 * Delivers the bundles this device is carrying to the server.
 *
 * Runs on the relay's own sync, because that is when this device is known to be online and the
 * server is known to be reachable. Bundles go up one at a time, oldest first, and each is dropped
 * only once the server has it: a run that stops half way leaves the rest to go next time rather
 * than losing them.
 */
@Injectable({ providedIn: 'root' })
export class P2pBundleUploadService {
  constructor(
    private readonly authService: AuthService,
    private readonly bundleStoreService: P2pBundleStoreService,
    private readonly dbSyncService: DBSyncService,
    private readonly http: HttpClient,
  ) { }

  init() {
    this.dbSyncService.subscribe(status => this.syncStatusChanged(status));
  }

  private async syncStatusChanged({ to }: { to?: SyncStatus }) {
    // Only the upward half has to have worked: this device is sending, and whether it also
    // received anything says nothing about whether the server can be reached.
    if (to !== SyncStatus.Success) {
      return;
    }

    // Checked every sync rather than once at startup, so a user granted the permission after
    // logging in starts relaying without having to reload.
    if (!await this.authService.has(PERMISSION)) {
      return;
    }

    try {
      await this.deliverPending();
    } catch (err) {
      // Never break syncing over this. The bundles are still held and the next sync tries again.
      console.error('P2pBundleUploadService :: Error delivering offline data bundles', err);
    }
  }

  /**
   * Sends everything this device is carrying.
   *
   * Stops at the first bundle the server could not take for a reason that might pass, so bundles
   * from one device keep their order.
   *
   * @returns how many the server took
   */
  async deliverPending(): Promise<number> {
    let delivered = 0;
    for (const bundle of await this.bundleStoreService.pending()) {
      if (!await this.deliver(bundle)) {
        return delivered;
      }
      delivered += 1;
    }
    return delivered;
  }

  /** False means stop for now. A bundle the server will never take is dropped, not retried. */
  private async deliver(bundle: StoredBundle): Promise<boolean> {
    try {
      await this.send(bundle);
    } catch (err) {
      if (!PERMANENT.includes((err as HttpErrorResponse)?.status)) {
        return false;
      }
      // Kept out of the log's detail on purpose: this device cannot read the bundle, and the
      // reason the server gave is about someone else's data.
      console.warn(`P2pBundleUploadService :: Discarding a bundle the server will not accept: ${bundle._id}`);
    }

    await this.bundleStoreService.remove(bundle._id);
    return true;
  }

  private async send(bundle: StoredBundle) {
    const payload = await this.bundleStoreService.getPayload(bundle._id);

    // Passed on exactly as it arrived. This device cannot verify the envelope or the signature,
    // and has no key for the body: only the server can make sense of any of it.
    await lastValueFrom(this.http.post(URL, payload, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Medic-Bundle-Envelope': bundle.envelope,
        'X-Medic-Bundle-Signature': bundle.signature,
      },
    }));
  }
}
