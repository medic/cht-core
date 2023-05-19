import { AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { SessionService } from '@mm-services/session.service';
import { Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { Selectors } from '@mm-selectors/index';

@Component({
  selector: 'error-log',
  templateUrl: './error-log.component.html'
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
  ) { }

  ngAfterViewInit() {
    this.subscribeToStore();
    this.userCtx = this.sessionService.userCtx();
    this.userName = this.userCtx.name;
    this.url = window.location.hostname;
    this.currentDate = Date.now();
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(){
    this.subscription.unsubscribe();
  }
}
