import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { HTTP_HEADERS } from '@medic/constants';

import { AuthService } from '@mm-services/auth.service';
import { DBSyncService, SyncStatus } from '@mm-services/db-sync.service';
import { OfflineSyncBundleStoreService, StoredBundle } from '@mm-services/offline-sync-bundle-store.service';

const PERMISSION = 'can_relay_offline_data_bundle';
const ENDPOINT = '/api/v1/replication/data-bundle';

// A body the server can never accept, however many times it is offered: it is over the limit and
// will not shrink. Any other refusal is counted, because it may be one an administrator can fix.
const NEVER_ACCEPTABLE = 413;

// How many times a bundle may be refused for a reason that might not last before this device stops
// offering it. Enough for an administrator to notice and fix a permission; few enough that one
// bundle nobody can fix does not hold up everything behind it for good.
const MAX_ATTEMPTS = 10;

/**
 * A 4xx is about the bundle or whoever sent it, so other senders are worth trying. A 401 is this
 * device's own session, and a 5xx or no answer at all is the server or the network: every bundle
 * would fare the same, so the run stops and the next sync resumes it, without counting it against
 * the bundle.
 */
const isAboutTheBundle = (status: number) => status >= 400 && status < 500 && status !== 401;

/** What became of one bundle, and so what the run does next. */
type Outcome = 'next' | 'hold_sender' | 'stop';

/**
 * Who a bundle is from, read off its cleartext envelope, which is there for exactly this.
 *
 * A bundle whose envelope cannot be read is a sender of its own: it holds nothing up but itself.
 */
const senderOf = (bundle: StoredBundle): string => {
  try {
    const bytes = Uint8Array.from(atob(bundle.envelope), char => char.codePointAt(0)!);
    const { user, device_id: deviceId } = JSON.parse(new TextDecoder().decode(bytes));
    return user && deviceId ? `${user}:${deviceId}` : bundle._id;
  } catch {
    return bundle._id;
  }
};

/**
 * Delivers the bundles this device is carrying to the server.
 *
 * Runs on the relay's own sync, because that is when this device is known to be online and the
 * server is known to be reachable. Bundles go up one at a time, oldest first, and each is dropped
 * only once the server has it: a run that stops half way leaves the rest to go next time rather
 * than losing them.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncBundleUploadService {
  constructor(
    private readonly authService: AuthService,
    private readonly bundleStoreService: OfflineSyncBundleStoreService,
    private readonly dbSyncService: DBSyncService,
    private readonly http: HttpClient,
  ) { }

  /** One run at a time: a manual sync can land on top of the scheduled one. */
  private delivering = false;

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

    // Anything a peer handed over while the user was elsewhere in the app is still sitting in
    // native storage: the screen that receives them only exists while it is open. A failure to
    // collect does not stop the delivery below it, so one bundle this phone cannot take off the
    // native side does not keep everything it already holds from being sent.
    try {
      await this.bundleStoreService.collect();
    } catch (err) {
      console.error('OfflineSyncBundleUploadService :: Error collecting delivered bundles', err);
    }

    try {
      await this.deliverPending();
    } catch (err) {
      // Syncing carries on: the bundles are still held and the next sync tries again.
      console.error('OfflineSyncBundleUploadService :: Error delivering offline data bundles', err);
    }
  }

  /**
   * Sends everything this device is carrying.
   *
   * Bundles from one device are a sequence, so once one of them is refused the rest of that
   * device's wait for the next sync. Other devices' bundles carry on: they have nothing to do with
   * it. A failure that is about the server or this device's own session stops the whole run.
   */
  async deliverPending(): Promise<void> {
    if (this.delivering) {
      return;
    }

    this.delivering = true;
    try {
      await this.deliverEach();
    } finally {
      this.delivering = false;
    }
  }

  private async deliverEach() {
    const held = new Set<string>();
    for (const bundle of await this.bundleStoreService.pending()) {
      if (await this.deliverUnlessHeld(bundle, held) === 'stop') {
        return;
      }
    }
  }

  /** Skips a bundle whose sender already had one refused this run, so their order is kept. */
  private async deliverUnlessHeld(bundle: StoredBundle, held: Set<string>): Promise<Outcome> {
    const sender = senderOf(bundle);
    if (held.has(sender)) {
      return 'hold_sender';
    }
    const outcome = await this.deliver(bundle);
    if (outcome === 'hold_sender') {
      held.add(sender);
    }
    return outcome;
  }

  /**
   * Sends one bundle, and says whether the run carries on.
   *
   * A bundle is deleted only when the server has it. A refusal never destroys it: this device
   * cannot read a bundle to judge what is in it, and it holds the only copy, so the most it will
   * do is stop offering one the server has turned down too many times.
   */
  private async deliver(bundle: StoredBundle): Promise<Outcome> {
    try {
      await this.send(bundle);
    } catch (err) {
      return this.refused(bundle, (err as HttpErrorResponse)?.status);
    }

    await this.bundleStoreService.remove(bundle);
    return 'next';
  }

  private async refused(bundle: StoredBundle, status: number): Promise<Outcome> {
    if (!isAboutTheBundle(status)) {
      return 'stop';
    }
    if (status === NEVER_ACCEPTABLE) {
      await this.giveUp(bundle, status);
      return 'next';
    }

    const attempts = await this.bundleStoreService.recordAttempt(bundle._id);
    if (attempts >= MAX_ATTEMPTS) {
      await this.giveUp(bundle, status);
      return 'next';
    }
    return 'hold_sender';
  }

  private async giveUp(bundle: StoredBundle, status: number) {
    // The id and the status only. This device cannot read the bundle, and the reason the server
    // gave is about someone else's data.
    console.warn(`OfflineSyncBundleUploadService :: No longer offering bundle ${bundle._id}, refused with ${status}`);
    await this.bundleStoreService.markUndeliverable(bundle._id, status);
  }

  private async send(bundle: StoredBundle) {
    const payload = await this.bundleStoreService.getPayload(bundle._id);

    // Passed on exactly as it arrived. This device cannot verify the envelope or the signature,
    // and has no key for the body: only the server can make sense of any of it.
    await lastValueFrom(this.http.post(ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/octet-stream',
        [HTTP_HEADERS.BUNDLE_ENVELOPE]: bundle.envelope,
        [HTTP_HEADERS.BUNDLE_SIGNATURE]: bundle.signature,
      },
    }));
  }
}
