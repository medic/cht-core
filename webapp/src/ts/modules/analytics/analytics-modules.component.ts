import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';

@Component({
  selector: 'analytics-modules',
  templateUrl: './analytics-modules.component.html'
})
export class AnalyticsModulesComponent implements OnInit, OnDestroy {
  subscriptions: Subscription = new Subscription();
  analyticsModules = [];
  loading = true;

  constructor(
    private store: Store
  ) { }

  ngOnInit() {
    this.loading = true;
    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getAnalyticsModules)
      .subscribe(analyticsModules => {
        this.analyticsModules = analyticsModules;
        this.loading = false;
      });
    this.subscriptions.add(subscription);
  }
}
