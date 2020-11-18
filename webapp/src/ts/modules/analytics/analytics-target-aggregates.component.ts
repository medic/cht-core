import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';

import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { Selectors } from '@mm-selectors/index';

@Component({
  selector: 'analytics-target-aggregates',
  templateUrl: './analytics-target-aggregates.component.html',
})
export class AnalyticsTargetAggregatesComponent implements OnInit, OnDestroy {
  private targetAggregatesActions: TargetAggregatesActions;
  subscriptions: Subscription = new Subscription();
  loading = true;
  enabled = false;
  aggregates = null;
  selected = null;
  error = null;

  constructor(
    private store: Store,
    private targetAggregatesService: TargetAggregatesService
  ) {
    this.targetAggregatesActions = new TargetAggregatesActions(store);
  }

  ngOnInit(): void {
    this.subscribeToStore();
    this.targetAggregatesActions.setTargetAggregatesError(null);
    this.targetAggregatesActions.setTargetAggregates(null);
    this.getTargetAggregates();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
    this.targetAggregatesService
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
      })
      .catch(err => {
        console.error('Error getting aggregate targets', err);
        this.targetAggregatesActions.setTargetAggregatesError(err);
      })
      .then(() => this.loading = false);
  }
}
