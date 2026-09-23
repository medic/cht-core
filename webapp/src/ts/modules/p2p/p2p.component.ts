import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { P2pResult, P2pService } from '@mm-services/p2p.service';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';

/**
 * What the screen is doing right now.
 *
 * Only pairing: bringing the two devices onto one network and proving each is talking to the
 * other. Moving data between them comes later and will add its own states.
 */
type P2pState = 'idle' | 'starting' | 'hosting' | 'joining' | 'paired' | 'failed';

@Component({
  templateUrl: './p2p.component.html',
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
export class P2pComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  state: P2pState = 'idle';
  /** Set only while hosting: the QR image a peer scans. */
  qrImage: string | null = null;
  /** Set only once joined: what the host calls itself, so the user can confirm the right device. */
  hostLabel: string | null = null;
  /** A translation key, never a message built natively. */
  errorKey: string | null = null;

  supported = false;
  canHost = false;
  canJoin = false;
  loading = true;

  constructor(private readonly p2pService: P2pService) { }

  async ngOnInit() {
    this.supported = this.p2pService.isSupported();
    [this.canHost, this.canJoin] = await Promise.all([
      this.p2pService.canHost(),
      this.p2pService.canJoin(),
    ]);
    this.loading = false;

    this.subscriptions.add(this.p2pService.hostingResult()
      .subscribe(result => this.onHostingResult(result)));
    this.subscriptions.add(this.p2pService.pairingResult()
      .subscribe(result => this.onPairingResult(result)));
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  startHosting() {
    this.reset();
    this.state = 'starting';
    this.p2pService.startHosting();
  }

  stopHosting() {
    this.p2pService.stopHosting();
    this.reset();
  }

  scanAndJoin() {
    this.reset();
    this.state = 'joining';
    this.p2pService.scanAndJoin();
  }

  leaveSession() {
    this.p2pService.leaveSession();
    this.reset();
  }

  private onHostingResult(result: P2pResult) {
    if (!result.ok) {
      return this.fail(result.detail);
    }
    this.qrImage = result.detail;
    this.state = 'hosting';
  }

  private onPairingResult(result: P2pResult) {
    if (!result.ok) {
      return this.fail(result.detail);
    }
    this.hostLabel = result.detail;
    this.state = 'paired';
  }

  /**
   * The native side sends a stable code, so it maps straight to a translation key. Nothing here
   * validates the code: what keeps a CHW from seeing a raw `p2p.error.<code>` is that every code
   * cht-android can report has a key in messages-en.properties, checked by check-p2p-codes.sh.
   * The fallback only covers an empty detail.
   */
  private fail(code: string) {
    this.errorKey = `p2p.error.${code || 'unknown'}`;
    this.state = 'failed';
  }

  private reset() {
    this.state = 'idle';
    this.qrImage = null;
    this.hostLabel = null;
    this.errorKey = null;
  }
}
