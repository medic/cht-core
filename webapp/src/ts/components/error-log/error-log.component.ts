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
  // The Clipboard API isn't available in every Android WebView. Without it the button is hidden
  // and support can still ask for a screenshot of the details.
  canCopy = !!navigator.clipboard?.writeText;
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
    try {
      await navigator.clipboard.writeText(this.getDetailsText());
      this.copied = true;
    } catch {
      this.copied = false;
    }
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(){
    this.subscription.unsubscribe();
  }
}
