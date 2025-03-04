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
import { NgIf, NgClass, NgFor } from '@angular/common';
import { ContentRowListItemComponent } from '@mm-components/content-row-list-item/content-row-list-item.component';
import { RouterOutlet } from '@angular/router';
import {
  AnalyticsTargetAggregatesSidebarFilterComponent
} from './analytics-target-aggregates-sidebar-filter.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'analytics-target-aggregates',
  templateUrl: './analytics-target-aggregates.component.html',
  imports: [
    NgIf,
    NgClass,
    NgFor,
    ContentRowListItemComponent,
    RouterOutlet,
    AnalyticsTargetAggregatesSidebarFilterComponent,
    TranslatePipe,
  ],
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
      this.targetAggregatesActions.setTargetAggregatesLoaded(false);
      if (this.enabled) {
        this.facilityFilter = userFacility;
        this.reportingPeriodFilter = reportingPeriod;
        aggregates = await this.targetAggregatesService.getAggregates(
          this.facilityFilter?._id, this.reportingPeriodFilter
        );
      }

      const reportingMonth = await this.targetAggregatesService.getReportingMonth(reportingPeriod);

      aggregates = aggregates
        .map(aggregate => this.formatAggregate(aggregate, userFacility, reportingPeriod, reportingMonth));

      this.targetAggregatesActions.setTargetAggregates(aggregates);
      this.targetAggregatesActions.setTargetAggregatesLoaded(true);

    } catch (error) {
      console.error('Error getting aggregate targets', error);
      this.targetAggregatesActions.setTargetAggregatesError(error);
    } finally {
      this.loading = false;
      this.trackPerformance?.stop({
        name: ['analytics', 'target_aggregates', 'load'].join(':'),
        recordApdex: true,
      });
    }
  }

  private formatAggregate(aggregate, userFacility, reportingPeriod, reportingMonth) {
    const filtersToDisplay: string[] = [];

    if (this.userFacilities.length > 1 && this.facilityFilter?.name) {
      aggregate.facility = userFacility?.name;
      filtersToDisplay.push(this.facilityFilter.name);
    }

    aggregate.reportingMonth = reportingMonth;
    aggregate.reportingPeriod = reportingPeriod;
    if (aggregate.reportingPeriod === ReportingPeriod.PREVIOUS) {
      filtersToDisplay.push(aggregate.reportingMonth);
    }
    aggregate.filtersToDisplay = filtersToDisplay;

    return aggregate;
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
