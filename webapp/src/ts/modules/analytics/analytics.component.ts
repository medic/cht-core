import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs/operators';
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
    this.subscribeRouterNavigation();
    this.globalActions.unsetSelected();
    this.getAnalyticsModules();

    this.tourService.startIfNeeded(this.route.snapshot);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const selectorsSubscription = combineLatest(this.store.select(Selectors.getAnalyticsModules))
      .subscribe(([ analyticsModules = [] ]) => {
        this.analyticsModules = analyticsModules;
      });
    this.subscriptions.add(selectorsSubscription);
  }

  private subscribeRouterNavigation() {
    const subscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.redirectToModule(this.analyticsModules));
    this.subscriptions.add(subscription);
  }

  private redirectToModule(analyticsModules) {
    if (!analyticsModules) {
      return;
    }

    const isAnalyticsTab = this.route.snapshot.firstChild?.data?.tab === 'analytics';

    if (isAnalyticsTab && analyticsModules.length === 1) {
      this.router.navigate(analyticsModules[0].route);
    }
  }

  private getAnalyticsModules() {
    return this.analyticsModulesService
      .get()
      .then(modules => {
        this.analyticsActions.setAnalyticsModules(modules);
        this.redirectToModule(modules);
      });
  }
}

