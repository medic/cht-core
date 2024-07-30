import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { AggregateTarget, TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { PerformanceService } from '@mm-services/performance.service';
import { GlobalActions } from '@mm-actions/global';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { ReportingPeriod } from '@mm-modules/analytics/analytics-target-aggregates-sidebar-filter.component';

@Component({
  selector: 'analytics-target-aggregates',
  templateUrl: './analytics-target-aggregates.component.html',
})
export class AnalyticsTargetAggregatesComponent implements OnInit, OnDestroy {

  private targetAggregatesActions: TargetAggregatesActions;
  private globalActions: GlobalActions;
  private trackPerformance;
  subscriptions: Subscription = new Subscription();
  loading = true;
  enabled = false;
  aggregates: any = null;
  selected = null;
  error = null;
  userFacilities;
  sidebarFilter;
  reportingPeriodFilter;
  facilityFilter;

  constructor(
    private store: Store,
    private targetAggregatesService: TargetAggregatesService,
    private performanceService: PerformanceService,
    private userSettingsService: UserSettingsService,
  ) {
    this.targetAggregatesActions = new TargetAggregatesActions(store);
    this.globalActions = new GlobalActions(store);
  }

  async ngOnInit() {
    try {
      this.trackPerformance = this.performanceService.track();
      this.enabled = await this.targetAggregatesService.isEnabled();
      this.subscribeToStore();
      await this.setDefaultFilters();
    } catch (error) {
      this.loading = false;
      console.error('Error loading aggregate targets', error);
      this.targetAggregatesActions.setTargetAggregatesError(error);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.targetAggregatesActions.setTargetAggregatesError(null);
    this.targetAggregatesActions.setTargetAggregates(null);
    this.targetAggregatesActions.setTargetAggregatesLoaded(false);
    this.globalActions.clearSidebarFilter();
  }

  private subscribeToStore() {
    const selectorsSubscription = combineLatest(
      this.store.select(Selectors.getTargetAggregates),
      this.store.select(Selectors.getSelectedTargetAggregate),
      this.store.select(Selectors.getTargetAggregatesError),
      this.store.select(Selectors.getSidebarFilter),
    ).subscribe(([
      aggregates,
      selected,
      error,
      sidebarFilter,
    ]) => {
      this.aggregates = aggregates;
      this.selected = selected;
      this.error = error;
      this.sidebarFilter = sidebarFilter;
    });
    this.subscriptions.add(selectorsSubscription);
  }

  async getTargetAggregates(userFacility, reportingPeriod) {
    try {
      let aggregates: AggregateTarget[] = [];
      if (this.enabled) {
        this.facilityFilter = userFacility;
        this.reportingPeriodFilter = reportingPeriod;
        aggregates = await this.targetAggregatesService.getAggregates(
          this.facilityFilter?._id, this.reportingPeriodFilter
        );
      }

      aggregates.forEach((aggregate) => {
        if (this.userFacilities.length > 1) {
          aggregate.facility = userFacility?.name;
        }
        aggregate.reportingPeriod = reportingPeriod;
      });

      this.targetAggregatesActions.setTargetAggregates(aggregates);
      this.targetAggregatesActions.setTargetAggregatesLoaded(true);

    } catch (error) {
      console.error('Error getting aggregate targets', error);
      this.targetAggregatesActions.setTargetAggregatesError(error);
    } finally {
      this.loading = false;
      this.trackPerformance?.stop({
        name: [ 'analytics', 'target_aggregates', 'load' ].join(':'),
        recordApdex: true,
      });
    }
  }

  private async setDefaultFilters() {
    this.userFacilities = await this.userSettingsService.getUserFacilities();
    this.userFacilities.sort((a, b) => a.name.localeCompare(b.name));
    const defaultFilters = {
      facility: this.userFacilities.length ? { ...this.userFacilities[0] } : null,
      reportingPeriod: ReportingPeriod.CURRENT,
    };
    this.globalActions.setSidebarFilter({ defaultFilters });
    await this.getTargetAggregates(defaultFilters.facility, defaultFilters.reportingPeriod);
  }
}
