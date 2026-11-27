import { AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { SessionService } from '@mm-services/session.service';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Selectors } from '@mm-selectors/index';
import { NgIf } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SimpleDateTimePipe } from '@mm-pipes/date.pipe';

@Component({
  selector: 'error-log',
  templateUrl: './error-log.component.html',
  imports: [NgIf, TranslatePipe, SimpleDateTimePipe]
})
export class ErrorLogComponent implements AfterViewInit, OnDestroy {
  @Input() errorStack;
  @Input() errorFor;
  @Input() reload;

  url;
  currentDate;
  replicationStatus;
  userCtx;
  userName;
  // Offline users (e.g. CHWs) see a plain message first, with the technical details behind "Show details".
  // Online users and admins see the details straight away.
  showDetails = false;
  copied = false;
  subscription = new Subscription();

  private subscribeToStore() {
    const reduxSubscription = this.store.select(Selectors.getReplicationStatus)
      .subscribe((replicationStatus) => {
        this.replicationStatus = replicationStatus;
      });
    this.subscription.add(reduxSubscription);
  }

  constructor(
    private sessionService: SessionService,
    private store: Store,
    private changeDetectorRef: ChangeDetectorRef,
    private translateService: TranslateService,
  ) { }

  ngAfterViewInit() {
    this.subscribeToStore();
    this.userCtx = this.sessionService.userCtx();
    this.userName = this.userCtx?.name;
    this.url = window.location.hostname;
    this.currentDate = Date.now();
    this.showDetails = this.sessionService.isOnlineOnly(this.userCtx);
    this.changeDetectorRef.detectChanges();
  }

  toggleDetails() {
    this.showDetails = !this.showDetails;
  }

  getDetailsText() {
    const lines = [
      this.translateService.instant('Error fetching ' + this.errorFor),
      `${this.translateService.instant('User Name')}: ${this.userName}`,
      `${this.translateService.instant('url')}: ${this.url}`,
      `${this.translateService.instant('date.time.title')}: ${new Date(this.currentDate).toISOString()}`,
    ];
    if (!this.replicationStatus?.disabled && this.replicationStatus?.lastSuccessTo) {
      const lastSync = new Date(this.replicationStatus.lastSuccessTo).toISOString();
      lines.push(`${this.translateService.instant('sync.last_success')}: ${lastSync}`);
    }
    lines.push('', this.errorStack);
    return lines.join('\n');
  }

  async copyDetails() {
    this.copied = await this.writeToClipboard(this.getDetailsText());
    this.changeDetectorRef.detectChanges();
  }

  private async writeToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // The Clipboard API isn't available in every Android WebView, so fall back to a hidden textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        return document.execCommand('copy');
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  ngOnDestroy(){
    this.subscription.unsubscribe();
  }
}
