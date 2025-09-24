import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { PerformanceService } from '@mm-services/performance.service';
import { GlobalActions } from '@mm-actions/global';
import { NgIf, NgFor, NgClass } from '@angular/common';
import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import {
  AnalyticsTargetsProgressComponent
} from '@mm-components/analytics-targets-progress/analytics-targets-progress.component';
import { AnalyticsSidebarFilterComponent } from './analytics-sidebar-filter.component';
import { ReportingPeriod } from '@mm-modules/analytics/analytics-target-aggregates-sidebar-filter.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { TranslateFromPipe } from '@mm-pipes/translate-from.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';
import { Selectors } from '@mm-selectors/index';

@Component({
  templateUrl: './analytics-targets.component.html',
  imports: [
    NgIf,
    ErrorLogComponent,
    NgFor,
    NgClass,
    AnalyticsTargetsProgressComponent,
    AnalyticsSidebarFilterComponent,
    TranslatePipe,
    ResourceIconPipe,
    TranslateFromPipe,
    LocalizeNumberPipe
  ]
})
export class AnalyticsTargetsComponent implements OnInit, OnDestroy {
  private globalActions: GlobalActions;
  subscriptions: Subscription = new Subscription();
  targets: any[] = [];
  loading = true;
  targetsDisabled = false;
  errorStack;
  trackPerformance;
  direction;
  sidebarFilter;

  constructor(
      private rulesEngineService: RulesEngineService,
      private performanceService: PerformanceService,
      private store: Store,
  ) {
    this.trackPerformance = this.performanceService.track();
    this.store.select(Selectors.getDirection).subscribe(direction => {
      this.direction = direction;
    });
    this.globalActions = new GlobalActions(store);
  }

  async ngOnInit() {
    try {
      this.subscribeToStore();
      this.getTargets();
      await this.setDefaultFilters();
    } catch (error) {
      console.error('Error loading aggregate targets', error);
    }
  }

  ngOnDestroy(): void {
    this.globalActions.clearSidebarFilter();
  }

  private subscribeToStore() {
    const selectorsSubscription = this.store.select(Selectors.getSidebarFilter)
        .subscribe((sidebarFilter) => {
          this.sidebarFilter = sidebarFilter;
        });
    this.subscriptions.add(selectorsSubscription);
  }

  private getTargets() {
    return this.rulesEngineService
        .isEnabled()
        .then(isEnabled => {
          this.targetsDisabled = !isEnabled;
          return isEnabled ? this.rulesEngineService.fetchTargets() : [];
        })
        .catch(err => {
          console.error('Error getting targets', err);
          this.errorStack = err.stack;
          return [];
        })
        .then((targets: any[] = []) => {
          this.loading = false;
          this.targets = targets.filter(target => target.visible !== false);
          this.trackPerformance?.stop({
            name: [ 'analytics', 'targets', 'load' ].join(':'),
            recordApdex: true,
          });
        });
  }

  handleReportingPeriodChange(reportingPeriod: ReportingPeriod) {
    // Handle reporting period change for targets
    console.log('Reporting period changed:', reportingPeriod);
  }

  private async setDefaultFilters() {
    const defaultFilters = {
      reportingPeriod: ReportingPeriod.CURRENT,
    };
    this.globalActions.setSidebarFilter({ defaultFilters });
  }
}
