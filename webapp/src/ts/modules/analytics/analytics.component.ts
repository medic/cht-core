import {Component, OnInit} from '@angular/core';
import { Store } from '@ngrx/store';
import { AnalyticsModulesService } from '../../services/analytics-modules.service';
import { AnalyticsActions } from '../../actions/analytics';
import { ActivatedRoute, Router } from '@angular/router';

const _ = require('lodash/core');

@Component({
  templateUrl: './analytics.component.html'
})
export class AnalyticsComponent implements OnInit {
  private analyticsActions;

  analyticsModules = [];
  loading = true;

  constructor(
    private store: Store,
    private analyticsModulesService:AnalyticsModulesService,
    private route:ActivatedRoute,
    private router:Router,
    //private tour:Tour Todo
  ) {
    this.analyticsActions = new AnalyticsActions(store);
  }

  ngOnInit() {
    // todo unset selected
    this.analyticsActions.setSelectedAnalytics(null);

    this.analyticsModulesService.get().then((modules) => {
      if (this.route.snapshot.routeConfig.path === 'analytics') {
        if (modules.length === 1) {
          return this.router.navigate([modules[0].route]);
        }
      } else {
        this.analyticsActions.setSelectedAnalytics(_.find(modules, { route: this.route.snapshot.routeConfig.path }));
      }

      this.loading = false;
      this.analyticsModules = modules;
    });

    /*if ($stateParams.tour) {
      Tour.start($stateParams.tour);
    }*/
  }
}

