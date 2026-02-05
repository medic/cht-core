import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { RulesEngineService } from '@mm-services/rules-engine.service';
import { PerformanceService } from '@mm-services/performance.service';
import { GlobalActions } from '@mm-actions/global';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import {
  AnalyticsTargetsProgressComponent
} from '@mm-components/analytics-targets-progress/analytics-targets-progress.component';
import {
  AnalyticsSidebarFilterComponent, AnalyticsSidebarFilterState,
  ReportingPeriod
} from '@mm-modules/analytics/analytics-sidebar-filter.component';
import { TranslatePipe } from '@ngx-translate/core';
import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { TranslateFromPipe } from '@mm-pipes/translate-from.pipe';
import { LocalizeNumberPipe } from '@mm-pipes/number.pipe';
import { Selectors } from '@mm-selectors/index';
import { TranslateService } from '@mm-services/translate.service';

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
    LocalizeNumberPipe,
  ],
})
export class AnalyticsTargetsComponent implements OnInit, OnDestroy {
  private readonly PREVIOUS_TARGETS_TITLE: string;
  private readonly globalActions: GlobalActions;
  subscriptions: Subscription = new Subscription();
  targets: any[] = [];
  loading = true;
  targetsDisabled = false;
  errorStack;
  trackPerformance;
  direction;
  sidebarFilter: AnalyticsSidebarFilterState = {
    reportingPeriod: AnalyticsSidebarFilterComponent.DEFAULT_REPORTING_PERIOD
  };

  constructor(
    private readonly rulesEngineService: RulesEngineService,
    private readonly performanceService: PerformanceService,
    translateService: TranslateService,
    private readonly store: Store
  ) {
    this.trackPerformance = this.performanceService.track();
    this.globalActions = new GlobalActions(store);
    this.PREVIOUS_TARGETS_TITLE = translateService.instant('targets.last_month.subtitle');
  }

  ngOnInit(): void {
    this.subscribeToStore();
    this.getTargets(AnalyticsSidebarFilterComponent.DEFAULT_REPORTING_PERIOD);
  }

  ngOnDestroy(): void {
    this.globalActions.clearSidebarFilter();
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const selectorsSubscription = combineLatest([
      this.store.select(Selectors.getSidebarFilter),
      this.store.select(Selectors.getDirection),
    ]).subscribe(([sidebarFilter, direction]) => {
      if (sidebarFilter) {
        this.sidebarFilter = sidebarFilter;
      }
      this.direction = direction;
    });
    this.subscriptions.add(selectorsSubscription);

    const backToCurrentSubscription = this.store
      .select(Selectors.getShowContent)
      .subscribe(showContent => {
        // User pressed the back button in the mobile layout for previous targets
        const returningToDefaultTargets = !showContent
          && this.sidebarFilter.reportingPeriod !== AnalyticsSidebarFilterComponent.DEFAULT_REPORTING_PERIOD;
        if (returningToDefaultTargets) {
          this.getTargets(AnalyticsSidebarFilterComponent.DEFAULT_REPORTING_PERIOD);
        }
      });
    this.subscriptions.add(backToCurrentSubscription);
  }

  getTargets(reportingPeriod: ReportingPeriod) {
    this.globalActions.setSidebarFilter({ reportingPeriod });
    // Show the back button in the mobile layout when viewing previous targets
    if (reportingPeriod === ReportingPeriod.PREVIOUS) {
      this.globalActions.setTitle(this.PREVIOUS_TARGETS_TITLE);
      this.globalActions.setShowContent(true);
    } else {
      this.globalActions.setShowContent(false);
    }

    return this.rulesEngineService
      .isEnabled()
      .then(isEnabled => {
        this.targetsDisabled = !isEnabled;
        return isEnabled ? this.rulesEngineService.fetchTargets(reportingPeriod) : [];
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
          name: ['analytics', 'targets', 'load'].join(':'),
          recordApdex: true,
        });
      });
  }
}
