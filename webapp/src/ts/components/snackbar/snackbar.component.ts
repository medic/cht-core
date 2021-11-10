import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';

@Component({
  selector: 'snackbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './snackbar.component.html'
})
export class SnackbarComponent implements OnInit {
  private subscription: Subscription = new Subscription();

  private readonly SHOW_DURATION = 5000;
  private readonly ANIMATION_DURATION = 250;
  private readonly ROUND_TRIP_ANIMATION_DURATION = this.ANIMATION_DURATION * 2;

  private globalActions;
  private hideTimeout;
  private showNextMessageTimeout;

  message;
  action;
  active = false;

  constructor(
    private store:Store,
    private changeDetectorRef:ChangeDetectorRef,
    private ngZone:NgZone,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  private setTimeout(callback, duration) {
    return this.ngZone.runOutsideAngular(() => {
      return setTimeout(callback, duration);
    });
  }

  ngOnInit() {
    this.changeDetectorRef.detach();
    const reduxSubscription = this.store.select(Selectors.getSnackbarContent).subscribe((snackbarContent) => {
      if (!snackbarContent?.message) {
        this.message = undefined;
        this.action = undefined;
        this.hide();

        return;
      }

      const { message, action } = snackbarContent;
      if (this.showNextMessageTimeout) {
        this.queueShowMessage(message, action);

        return;
      }

      if (this.active) {
        this.setTimeout(() => this.resetMessage(), this.ANIMATION_DURATION);
        this.queueShowMessage(message, action);

        return;
      }

      this.show(message, action);
    });
    this.subscription.add(reduxSubscription);
    this.hide();
  }

  private queueShowMessage(message, action) {
    clearTimeout(this.showNextMessageTimeout);
    this.showNextMessageTimeout = this.setTimeout(() => this.show(message, action), this.ROUND_TRIP_ANIMATION_DURATION);
  }

  private show(message, action) {
    clearTimeout(this.showNextMessageTimeout);
    this.showNextMessageTimeout = undefined;
    this.message = message;
    this.action = action;
    this.active = true;
    this.changeDetectorRef.detectChanges();

    this.hideTimeout = this.setTimeout(() => this.resetMessage(), this.SHOW_DURATION);
  }

  private hide() {
    clearTimeout(this.hideTimeout);
    this.hideTimeout = undefined;
    this.active = false;
    this.changeDetectorRef.detectChanges();
  }

  private resetMessage() {
    this.globalActions.setSnackbarContent();
  }
}
