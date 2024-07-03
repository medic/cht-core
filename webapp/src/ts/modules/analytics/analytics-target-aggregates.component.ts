import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { Selectors } from '@mm-selectors/index';
import { PerformanceService } from '@mm-services/performance.service';
import { SidebarFilterService } from '@mm-services/sidebar-filter.service';
import { AnalyticsTargetAggregatesSidebarFilterComponent }
  from './analytics-target-aggregates-sidebar-filter.component';

@Component({
  selector: 'analytics-target-aggregates',
  templateUrl: './analytics-target-aggregates.component.html',
})
export class AnalyticsTargetAggregatesComponent implements OnInit, OnDestroy {
  @ViewChild(AnalyticsTargetAggregatesSidebarFilterComponent) analyticsTargetAggregatesFilterComponent?:
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
    private sidebarFilterService: SidebarFilterService
  ) {
    this.targetAggregatesActions = new TargetAggregatesActions(store);
  }

  ngOnInit(): void {
    this.trackPerformance = this.performanceService.track();
    this.subscribeToStore();
    this.subscribeSidebarFilter();
    this.getTargetAggregates();
    this.subscribeToToggleFilter();
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

  private getTargetAggregates() {
    return this.targetAggregatesService
      .isEnabled()
      .then(enabled => {
        this.enabled = enabled;

        if (!this.enabled) {
          return;
        }

        return this.targetAggregatesService.getAggregates();
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
      .subscribe(({ isOpen }) => this.isSidebarFilterOpen = !!isOpen);
    this.subscriptions.add(subscription);
  }

  private subscribeToToggleFilter() {
    this.subscriptions.add(
      this.sidebarFilterService.toggleFilter.subscribe(() => {
        this.toggleFilter();
      })
    );
  }

  toggleFilter() {
    this.analyticsTargetAggregatesFilterComponent?.toggleSidebarFilter();
  }
}
