import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { find as _find } from 'lodash-es';

import { AnalyticsModulesService } from '@mm-services/analytics-modules.service';
import { AnalyticsActions } from '@mm-actions/analytics';
import { GlobalActions } from '@mm-actions/global';

@Component({
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit {
  private analyticsActions;
  private globalActions;

  analyticsModules = [];
  loading = true;

  constructor(
    private store: Store,
    private analyticsModulesService: AnalyticsModulesService,
    private route: ActivatedRoute,
    private router: Router,
    //private tour:Tour Todo
  ) {
    this.analyticsActions = new AnalyticsActions(store);
    this.globalActions = new GlobalActions(store);

  }

  ngOnInit() {
    this.analyticsActions.setSelectedAnalytics(null);
    this.globalActions.unsetSelected();

    this.analyticsModulesService
      .get()
      .then((modules) => {
        if (this.route.snapshot.routeConfig.path === 'analytics') {
          if (modules.length === 1) {
            return this.router.navigate([modules[0].route]);
          }
        } else {
          this.analyticsActions.setSelectedAnalytics(_find(modules, { route: this.route.snapshot.routeConfig.path }));
        }

        this.loading = false;
        this.analyticsModules = modules;
      });

    /*if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }*/
  }
}

