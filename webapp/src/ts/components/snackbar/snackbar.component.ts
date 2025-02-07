import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { filter, delay } from 'rxjs/operators';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { NgIf } from '@angular/common';

@Component({
    selector: 'snackbar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './snackbar.component.html',
    standalone: true,
    imports: [NgIf]
})
export class SnackbarComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();

  private readonly SHOW_DURATION = 5000;
  private readonly ANIMATION_DURATION = 250;
  private readonly ROUND_TRIP_ANIMATION_DURATION = this.ANIMATION_DURATION * 2;
  private readonly WAIT_FOR_FAB = 500;

  private globalActions: GlobalActions;
  private hideTimeout;
  private showNextMessageTimeout;
  private resetMessageTimeout;

  message;
  action;
  active = false;
  displayAboveFab = true;

  constructor(
    private store: Store,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  private setTimeout(callback, duration) {
    return this.ngZone.runOutsideAngular(() => {
      return setTimeout(callback, duration);
    });
  }

  ngOnInit() {
    this.subscribeToRoute();
    this.changeDetectorRef.detach();
    const reduxSubscription = this.store
      .select(Selectors.getSnackbarContent)
      .subscribe((snackbarContent) => {
        if (!snackbarContent?.message) {
          this.hide();
          return;
        }

        const { message, action } = snackbarContent;
        if (this.active) {
          this.queueShowMessage(message, action);
          return;
        }

        this.show(message, action);
      });
    this.subscription.add(reduxSubscription);
    this.hide();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private subscribeToRoute() {
    const subscription = this.router.events
      .pipe(
        delay(this.WAIT_FOR_FAB),
        filter(event => event instanceof NavigationEnd),
      ).subscribe(() => {
        if (!this.active) {
          return;
        }
        this.displayAboveFab = this.isFABDisplayed();
        // Snackbar is running outside Angular's zone (#6719), calling detectChanges to refresh component.
        this.changeDetectorRef.detectChanges();
      });
    this.subscription.add(subscription);
  }

  private queueShowMessage(message, action) {
    clearTimeout(this.resetMessageTimeout);
    clearTimeout(this.showNextMessageTimeout);
    this.resetMessageTimeout = this.setTimeout(() => this.resetMessage(), this.ANIMATION_DURATION);
    this.showNextMessageTimeout = this.setTimeout(
      () => this.globalActions.setSnackbarContent(message, action),
      this.ROUND_TRIP_ANIMATION_DURATION,
    );
  }

  private show(message, action) {
    this.displayAboveFab = this.isFABDisplayed();
    clearTimeout(this.hideTimeout);
    this.hideTimeout = undefined;
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
    this.message = undefined;
    this.action = undefined;
    this.active = false;
    this.changeDetectorRef.detectChanges();
  }

  private resetMessage() {
    this.globalActions.setSnackbarContent();
  }

  private isFABDisplayed(): boolean {
    return !!$('.fast-action-fab-button:visible').length;
  }
}
