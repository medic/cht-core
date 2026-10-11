import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { FeedbackService } from '@mm-services/feedback.service';
import { DeviceKeyService } from '@mm-services/device-key.service';
import { BundleScope } from '@mm-services/offline-data-bundle.service';
import { OfflineSyncBundleStoreService } from '@mm-services/offline-sync-bundle-store.service';
import { OfflineSyncResult, OfflineSyncService } from '@mm-services/offline-sync.service';
import { OfflineSyncTransferService } from '@mm-services/offline-sync-transfer.service';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';

const CODE = /^[a-z0-9_]+$/;
const STORE_UNREADABLE = 'offline_sync.error.bundle_store_unreadable';

/** What the screen is doing right now. */
type OfflineSyncState = 'idle' | 'starting' | 'hosting' | 'joining' | 'paired' | 'sending' | 'sent' | 'failed';

@Component({
  templateUrl: './offline-sync.component.html',
  imports: [
    ToolBarComponent,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatButton,
    MatProgressBar,
    MatRadioButton,
    MatRadioGroup,
    FormsModule,
    TranslateDirective,
    TranslatePipe,
  ],
})
export class OfflineSyncComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();
  private countRuns = 0;

  state: OfflineSyncState = 'idle';
  /** Set only while hosting: the QR image a peer scans. */
  qrImage: string | null = null;
  /** Shown beside the code, so a peer who cannot scan can still join the network. */
  ssid: string | null = null;
  password: string | null = null;
  /** Set only once joined: what the host calls itself, so the user can confirm the right device. */
  hostLabel: string | null = null;
  /** A translation key, not text from the native side. */
  errorKey: string | null = null;

  /**
   * How far back to send. `sync` covers everything the server has not confirmed receiving, which
   * re-sends anything handed to a relay that never arrived; `export` covers only what is new since
   * the last handover and trusts that the earlier ones landed.
   */
  scope: BundleScope = 'sync';
  /** How many bundles the host took, shown once a handover finishes. */
  delivered = 0;
  /** How many documents were too large to travel this way, shown so the user knows. */
  skipped = 0;
  /** How many bundles this device is carrying for other people. */
  carrying = 0;

  supported = false;
  canHost = false;
  canJoin = false;
  /**
   * Whether this phone can actually seal anything yet.
   *
   * Keys are handed out by the server while this device is online, so a phone that has not been
   * online since the permission was granted cannot send. Asked here rather than at the moment of
   * sending, because by then the user may have no network to fix it.
   */
  ready = false;
  loading = true;

  constructor(
    private readonly bundleStoreService: OfflineSyncBundleStoreService,
    private readonly deviceKeyService: DeviceKeyService,
    private readonly feedbackService: FeedbackService,
    private readonly offlineSyncService: OfflineSyncService,
    private readonly transferService: OfflineSyncTransferService,
  ) { }

  async ngOnInit() {
    this.supported = this.offlineSyncService.isSupported();
    const [canHost, canJoin, keys] = await Promise.all([
      this.offlineSyncService.canHost(),
      this.offlineSyncService.canJoin(),
      this.readKeyMaterial(),
    ]);
    this.canHost = canHost;
    this.canJoin = canJoin;
    this.ready = !!keys;
    this.loading = false;

    this.subscriptions.add(this.offlineSyncService.hostingResult()
      .subscribe(result => this.onHostingResult(result)));
    this.subscriptions.add(this.offlineSyncService.pairingResult()
      .subscribe(result => this.onPairingResult(result)));
    // Granting the permission is what the failure asked the user to do, so the screen goes back to
    // offering the action rather than leaving them looking at a message they have already acted on.
    this.subscriptions.add(this.offlineSyncService.permissionsResolved()
      .subscribe(granted => granted && this.startOver()));
    this.subscriptions.add(this.offlineSyncService.bundleReceived()
      .subscribe(() => this.collectBundles()));

    // Counted last, once the screen is usable and listening, so a slow or failing store neither
    // keeps the spinner up nor causes a result to be missed.
    await this.countCarried();
  }

  /** A key store that cannot be read is treated as having no keys: the page still opens. */
  private async readKeyMaterial() {
    try {
      return await this.deviceKeyService.getKeyMaterial();
    } catch (err: any) {
      console.error('OfflineSyncComponent :: Error reading the device keys', err);
      return null;
    }
  }

  /**
   * Counts run concurrently, at startup and after each delivery, so only the latest one is applied:
   * an older count landing late would otherwise show a total that no longer holds.
   */
  private async countCarried() {
    const run = ++this.countRuns;
    try {
      const carrying = await this.bundleStoreService.count();
      if (run === this.countRuns) {
        this.showCount(carrying);
      }
    } catch (err: any) {
      console.error('OfflineSyncComponent :: Error counting the bundles this device carries', err);
      if (run === this.countRuns) {
        this.showCountFailed();
      }
    }
  }

  private showCount(carrying: number) {
    this.carrying = carrying;
    if (this.errorKey === STORE_UNREADABLE) {
      this.errorKey = null;
    }
  }

  private showCountFailed() {
    if (!this.errorKey) {
      this.errorKey = STORE_UNREADABLE;
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  /** Clears a failure, so the user can act again. */
  startOver() {
    this.reset();
  }

  startHosting() {
    this.reset();
    this.state = 'starting';
    this.offlineSyncService.startHosting();
  }

  stopHosting() {
    this.offlineSyncService.stopHosting();
    this.reset();
  }

  scanAndJoin() {
    this.reset();
    this.state = 'joining';
    this.offlineSyncService.scanAndJoin();
  }

  leaveSession() {
    this.offlineSyncService.leaveSession();
    this.reset();
  }

  private onHostingResult(result: OfflineSyncResult) {
    if (!result.ok) {
      return this.fail(result.detail, result.diagnostic);
    }
    this.qrImage = result.session?.qr ?? null;
    this.ssid = result.session?.ssid ?? null;
    this.password = result.session?.password ?? null;
    this.state = 'hosting';
  }

  /**
   * Hands this device's data to the paired host.
   *
   * Nothing is retried here. A handover that stops leaves the rest of the data on this device and
   * the user is told, because a relay that has gone out of range is not something to work around
   * quietly.
   */
  async send() {
    this.state = 'sending';
    this.errorKey = null;
    try {
      ({ delivered: this.delivered, skipped: this.skipped } = await this.transferService.handOver(this.scope));
      this.state = 'sent';
    } catch (err: any) {
      this.fail(err?.message);
    }
  }

  /** Takes what a peer has just delivered into this device's store. */
  private async collectBundles() {
    try {
      await this.bundleStoreService.collect();
    } catch (err: any) {
      // The bundle stays on the native side and is collected again, so the session is left alone,
      // and the user is told which step failed.
      console.error('OfflineSyncComponent :: Error collecting a delivered bundle', err);
      this.errorKey = err?.message === 'bundle_read_failed'
        ? 'offline_sync.error.bundle_read_failed'
        : 'offline_sync.error.bundle_store_failed';
    }
    // Also after a failure: collect() stores bundles one at a time, so some may have landed.
    await this.countCarried();
  }

  private onPairingResult(result: OfflineSyncResult) {
    if (!result.ok) {
      return this.fail(result.detail, result.diagnostic);
    }
    this.hostLabel = result.detail;
    this.state = 'paired';
  }

  /**
   * Turns a failure into a translation key.
   *
   * Codes reach this from two places, the native side and the webapp's own transfer services, and
   * each of them needs a key in each of the five supported languages. What that cannot cover is an
   * ordinary runtime error arriving here as a sentence, so anything not shaped like a code is
   * treated as unknown rather than rendered as `offline_sync.error.Something went wrong`.
   */
  private fail(code: string, diagnostic?: string) {
    this.errorKey = `offline_sync.error.${CODE.test(code) ? code : 'unknown'}`;
    this.state = 'failed';
    // Hosting is entirely on-device, so nothing about a failure reaches the server on its own.
    // Without this, the only record of why a session failed is a sentence on a screen in the
    // field, and support has nothing to look at.
    this.feedbackService
      .submit({
        message: `Offline sync failed: ${code} [${this.offlineSyncService.deviceDescription()}]`
          + (diagnostic ? ` ${diagnostic}` : ''),
      })
      .catch(err => console.error('OfflineSyncComponent :: Error recording the failure', err));
  }

  private reset() {
    this.state = 'idle';
    this.qrImage = null;
    this.ssid = null;
    this.password = null;
    this.hostLabel = null;
    this.errorKey = null;
    this.delivered = 0;
    this.skipped = 0;
  }
}
