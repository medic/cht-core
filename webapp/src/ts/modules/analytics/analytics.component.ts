import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { SidebarFilterService } from '@mm-services/sidebar-filter.service';

@Component({
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit, OnDestroy {

  private globalActions;
  subscriptions: Subscription = new Subscription();
  analyticsModules = [];

  constructor(
    private store: Store,
    private sidebarFilterService: SidebarFilterService,
  ) {
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

  onToggleFilter() {
    this.sidebarFilterService.triggerToggleFilter();
  }
}

