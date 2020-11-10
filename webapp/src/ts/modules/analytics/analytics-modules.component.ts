import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { Router } from '@angular/router';

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
    private store: Store,
    private router: Router,
  ) { }

  ngOnInit() {
    this.loading = true;
    this.subscribeToStore();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  navigate(module) {
    if (!module || !module.route) {
      return;
    }
    this.router.navigate([module.route]);
  }

  private subscribeToStore() {
    const selectorsSubscription = combineLatest(
      this.store.select(Selectors.getAnalyticsModules),
    )
    .subscribe(([
      analyticsModules = [],
    ]) => {
      this.analyticsModules = analyticsModules;
      this.loading = false;
    });
    this.subscriptions.add(selectorsSubscription);
  }
}
