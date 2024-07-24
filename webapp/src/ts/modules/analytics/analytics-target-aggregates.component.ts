import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { Selectors } from '@mm-selectors/index';
import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { PerformanceService } from '@mm-services/performance.service';

@Component({
  selector: 'analytics-target-aggregates',
  templateUrl: './analytics-target-aggregates.component.html',
})
export class AnalyticsTargetAggregatesComponent implements OnInit, OnDestroy {
  private targetAggregatesActions: TargetAggregatesActions;
  private trackPerformance;
  subscriptions: Subscription = new Subscription();
  loading = true;
  enabled = false;
  aggregates: any = null;
  selected = null;
  error = null;
  isSidebarFilterOpen = false;

  constructor(
    private store: Store,
    private targetAggregatesService: TargetAggregatesService,
    private performanceService: PerformanceService,
  ) {
    this.targetAggregatesActions = new TargetAggregatesActions(store);
  }

  async ngOnInit(): Promise<void> {
    this.trackPerformance = this.performanceService.track();
    this.subscribeToStore();
    this.subscribeSidebarFilter();
    this.getTargetAggregates();
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
    const subscription = this.store
      .select(Selectors.getSidebarFilter)
      .subscribe((filterState) => this.isSidebarFilterOpen = filterState?.isOpen ?? false);
    this.subscriptions.add(subscription);
  }
}
