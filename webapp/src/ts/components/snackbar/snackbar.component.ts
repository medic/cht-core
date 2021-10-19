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

  private globalActions;
  private timer;

  content;
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
      if (!snackbarContent || !snackbarContent.content) {
        return;
      }

      const { content, action } = snackbarContent;
      if (this.active) {
        this.hide(false);
        this.setTimeout(() => this.show(content, action), this.ANIMATION_DURATION);

        return;
      }

      this.show(content, action);
    });
    this.subscription.add(reduxSubscription);
    this.hide();
  }

  private show(content, action) {
    this.content = content;
    this.action = action;
    this.active = true;
    this.changeDetectorRef.detectChanges();

    this.timer = this.setTimeout(() => this.hide(), this.SHOW_DURATION);
  }

  private hide(clearContent = true) {
    clearTimeout(this.timer);
    if (clearContent) {
      this.globalActions.setSnackbarContent();
      this.active = false;
      this.changeDetectorRef.detectChanges();
    }
  }
}
