import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { find as _find } from 'lodash-es';
import { combineLatest, Subscription } from 'rxjs';

import { TourService } from '@mm-services/tour.service';
import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { AnalyticsActions } from '@mm-actions/analytics';
import { GlobalActions } from '@mm-actions/global';
import { Selectors } from '@mm-selectors/index';

@Component({
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private analyticsActions;
  private globalActions;
  subscriptions: Subscription = new Subscription();
  analyticsModules = [];

  constructor(
    private store: Store,
    private analyticsModulesService: AnalyticsModulesService,
    private route: ActivatedRoute,
    private router: Router,
    private tourService: TourService,
  ) {
    this.analyticsActions = new AnalyticsActions(store);
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.analyticsActions.setSelectedAnalytics(null);
    this.globalActions.unsetSelected();
    this.getAnalyticsModules();

    this.tourService.startIfNeeded(this.route.snapshot);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const selectorsSubscription = combineLatest(
      this.store.select(Selectors.getAnalyticsModules),
    )
      .subscribe(([
        analyticsModules = [],
      ]) => {
        this.analyticsModules = analyticsModules;
      });
    this.subscriptions.add(selectorsSubscription);
  }

  private getAnalyticsModules() {
    return this.analyticsModulesService
      .get()
      .then((modules) => {
        this.analyticsActions.setAnalyticsModules(modules);
        if (this.route.snapshot.routeConfig?.path === 'analytics') {
          if (modules.length === 1) {
            return this.router.navigate(modules[0].route);
          }
        } else {
          const selectedAnalytics = _find(modules, { id: this.route.snapshot?.firstChild?.data?.moduleId });
          this.analyticsActions.setSelectedAnalytics(selectedAnalytics);
        }
      });
  }
}

