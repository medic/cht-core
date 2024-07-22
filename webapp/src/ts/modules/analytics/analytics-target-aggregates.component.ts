import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { PerformanceService } from '@mm-services/performance.service';
import { AnalyticsTargetAggregatesSidebarFilterComponent }
  from './analytics-target-aggregates-sidebar-filter.component';

@Component({
  selector: 'analytics-target-aggregates',
  templateUrl: './analytics-target-aggregates.component.html',
})
export class AnalyticsTargetAggregatesComponent implements OnInit, OnDestroy {
  @ViewChild(AnalyticsTargetAggregatesSidebarFilterComponent) sidebarFilter?:
   AnalyticsTargetAggregatesSidebarFilterComponent;

  private targetAggregatesActions: TargetAggregatesActions;
  private trackPerformance;
  subscriptions: Subscription = new Subscription();
  loading = true;
  enabled = false;
  aggregates: any = null;
  selected = null;
  error = null;
  useSidebarFilter = true;
  isSidebarFilterOpen = false;

  constructor(
    private store: Store,
    private targetAggregatesService: TargetAggregatesService,
    private performanceService: PerformanceService,
    private userSettingsService: UserSettingsService,
  ) {
    this.targetAggregatesActions = new TargetAggregatesActions(store);
  }

  async ngOnInit(): Promise<void> {
    this.trackPerformance = this.performanceService.track();
    this.subscribeToStore();
    this.subscribeSidebarFilter();
    const userFacilityId = await this.setFacilityId();
    await this.getTargetAggregates(userFacilityId);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.targetAggregatesActions.setTargetAggregatesError(null);
    this.targetAggregatesActions.setTargetAggregates(null);
    this.targetAggregatesActions.setTargetAggregatesLoaded(false);
  }

  private subscribeToStore() {
    const selectorsSubscription = combineLatest(
      this.store.select(Selectors.getTargetAggregates),
      this.store.select(Selectors.getSelectedTargetAggregate),
      this.store.select(Selectors.getTargetAggregatesError),
    )
      .subscribe(([
        aggregates,
        selected,
        error
      ]) => {
        this.aggregates = aggregates;
        this.selected = selected;
        this.error = error;
      });
    this.subscriptions.add(selectorsSubscription);
  }

  private async setFacilityId() {
    const userFacilities = await this.userSettingsService.getUserFacility();
    return userFacilities[0]?._id;
  }

  getTargetAggregates(userFacilityId?) {
    return this.targetAggregatesService
      .isEnabled()
      .then(enabled => {
        this.enabled = enabled;

        if (!this.enabled) {
          return;
        }

        return this.targetAggregatesService.getAggregates(userFacilityId);
      })
      .then(aggregates => {
        this.targetAggregatesActions.setTargetAggregates(aggregates);
        this.targetAggregatesActions.setTargetAggregatesLoaded(true);
      })
      .catch(err => {
        console.error('Error getting aggregate targets', err);
        this.targetAggregatesActions.setTargetAggregatesError(err);
      })
      .finally(() => {
        this.loading = false;
        this.trackPerformance?.stop({
          name: [ 'analytics', 'target_aggregates', 'load' ].join(':'),
          recordApdex: true,
        });
      });
  }

  private subscribeSidebarFilter() {
    if (!this.useSidebarFilter) {
      return;
    }

    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe((filterState) => this.isSidebarFilterOpen = filterState?.isOpen ?? false);
    this.subscriptions.add(subscription);
  }
}
