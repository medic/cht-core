import { Component, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription, filter } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';
import { AnalyticsTargetAggregatesSidebarFilterComponent }
  from './analytics-target-aggregates-sidebar-filter.component';
import { SidebarFilterService } from '@mm-services/sidebar-filter.service';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  @ViewChild(AnalyticsTargetAggregatesSidebarFilterComponent) analyticsTargetAggregatesFilterComponent?:
   AnalyticsTargetAggregatesSidebarFilterComponent;

  private globalActions;
  subscriptions: Subscription = new Subscription();
  analyticsModules = [];
  showFilterButton = false;

  constructor(
    private store: Store,
    private router: Router,
    private sidebarFilterService: SidebarFilterService
  ) {
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.subscribeToRouteChanges();
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

  private subscribeToRouteChanges() {
    const routeSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.canDisplayFilterButton(event.urlAfterRedirects);
    });
    this.subscriptions.add(routeSubscription);
  }

  private canDisplayFilterButton(currentRoute) {
    this.showFilterButton = currentRoute.includes('target-aggregates');
  }

  toggleFilter() {
    this.sidebarFilterService.toggleSidebarFilter();
  }
}

