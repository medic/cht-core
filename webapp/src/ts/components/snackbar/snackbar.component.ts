import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index'
import { GlobalActions } from '@mm-actions/global';


@Component({
  selector: 'snackbar',
  templateUrl: './snackbar.component.html'
})
export class SnackbarComponent implements OnInit {
  private subscription: Subscription = new Subscription();

  private readonly SHOW_DURATION = 5000;
  private readonly ANIMATION_DURATION = 250;

  private globalActions;
  private timer;

  content;
  active = false;

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    const reduxSubscription = this.store.select(Selectors.getSnackbarContent).subscribe(content => {
      if (!content) {
        return;
      }

      if (this.timer) {
        this.hide();
        setTimeout(() => this.show(content), this.ANIMATION_DURATION);
        return;
      }

      this.show(content);
    });
    this.subscription.add(reduxSubscription);
    this.hide();
  }

  // todo refresh timeout when new show action happens

  private show(content) {
    console.log(content);
    this.content = content;
    this.active = true;

    this.timer = setTimeout(() => this.hide(), this.SHOW_DURATION);
  }

  private hide() {
    this.globalActions.setSnackbarContent();
    this.active = false;
  }
}
