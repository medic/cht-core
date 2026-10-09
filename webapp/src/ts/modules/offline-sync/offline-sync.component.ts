import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { FeedbackService } from '@mm-services/feedback.service';
import { OfflineSyncResult, OfflineSyncService } from '@mm-services/offline-sync.service';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';

/**
 * What the screen is doing right now.
 *
 * Only pairing: bringing the two devices onto one network and proving each is talking to the
 * other. Moving data between them comes later and will add its own states.
 */
type OfflineSyncState = 'idle' | 'starting' | 'hosting' | 'joining' | 'paired' | 'failed';

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
    TranslateDirective,
    TranslatePipe,
  ],
})
export class OfflineSyncComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  state: OfflineSyncState = 'idle';
  /** Set only while hosting: the QR image a peer scans. */
  qrImage: string | null = null;
  /** Shown beside the code, so a peer who cannot scan can still join the network. */
  ssid: string | null = null;
  password: string | null = null;
  /** Set only once joined: what the host calls itself, so the user can confirm the right device. */
  hostLabel: string | null = null;
  /** A translation key, never a message built natively. */
  errorKey: string | null = null;

  supported = false;
  canHost = false;
  canJoin = false;
  loading = true;

  constructor(
    private readonly offlineSyncService: OfflineSyncService,
    private readonly feedbackService: FeedbackService,
  ) { }

  async ngOnInit() {
    this.supported = this.offlineSyncService.isSupported();
    [this.canHost, this.canJoin] = await Promise.all([
      this.offlineSyncService.canHost(),
      this.offlineSyncService.canJoin(),
    ]);
    this.loading = false;

    this.subscriptions.add(this.offlineSyncService.hostingResult()
      .subscribe(result => this.onHostingResult(result)));
    this.subscriptions.add(this.offlineSyncService.pairingResult()
      .subscribe(result => this.onPairingResult(result)));
    // Granting the permission is what the failure asked the user to do, so the screen goes back to
    // offering the action rather than leaving them looking at a message they have already acted on.
    this.subscriptions.add(this.offlineSyncService.permissionsResolved()
      .subscribe(granted => granted && this.startOver()));
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

  private onPairingResult(result: OfflineSyncResult) {
    if (!result.ok) {
      return this.fail(result.detail, result.diagnostic);
    }
    this.hostLabel = result.detail;
    this.state = 'paired';
  }

  /**
   * The native side sends a stable code, so it maps straight to a translation key. Nothing here
   * validates the code, so every code cht-android can report needs a key in each of the five
   * supported languages, or the raw `offline_sync.error.<code>` is what the user sees.
   * The fallback only covers an empty detail.
   */
  private fail(code: string, diagnostic?: string) {
    this.errorKey = `offline_sync.error.${code || 'unknown'}`;
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
  }
}
