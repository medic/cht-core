import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { ToolBarComponent } from '../../components/tool-bar/tool-bar.component';
import { AnalyticsFilterComponent } from '../../components/filters/analytics-filter/analytics-filter.component';
import { RouterOutlet } from '@angular/router';

@Component({
  templateUrl: './analytics.component.html',
  imports: [ToolBarComponent, AnalyticsFilterComponent, RouterOutlet]
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private globalActions;
  subscriptions: Subscription = new Subscription();
  analyticsModules = [];

  constructor(private store: Store) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.globalActions.unsetSelected();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const subscription = this.store
      .select(Selectors.getAnalyticsModules)
      .subscribe(analyticsModules => this.analyticsModules = analyticsModules);
    this.subscriptions.add(subscription);
  }
}

