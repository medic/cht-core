import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { Selectors } from '@mm-selectors/index';
import { TargetAggregatesActions } from '@mm-actions/target-aggregates';
import { TargetAggregatesService } from '@mm-services/target-aggregates.service';
import { GlobalActions } from '@mm-actions/global';

@Component({
  selector: 'analytics-target-aggregates-detail',
  templateUrl: './analytics-target-aggregates-detail.component.html'
})
export class AnalyticsTargetAggregatesDetailComponent implements OnInit, OnDestroy {
  private targetAggregatesActions: TargetAggregatesActions;
  private globalActions: GlobalActions;
  subscriptions: Subscription = new Subscription();
  aggregates = null;
  selected = null;
  error = null;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private targetAggregatesService: TargetAggregatesService,
    private translateService: TranslateService
  ) {
    this.targetAggregatesActions = new TargetAggregatesActions(store);
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    this.subscribeToStore();
    const routeSubscription = this.route.params.subscribe(params => this.getAggregatesDetail(params.id));
    this.subscriptions.add(routeSubscription);
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

  private getAggregatesDetail(aggregateId) {
    if (!aggregateId) {
      this.globalActions.setShowContent(false);
      this.targetAggregatesActions.setSelectedTargetAggregate(null);
      this.globalActions.setTitle();
      return;
    }

    this.globalActions.setShowContent(true);
    const aggregateDetails = this.targetAggregatesService.getAggregateDetails(aggregateId, this.aggregates);

    if (!aggregateDetails) {
      console.error(`Error selecting target: target with id ${aggregateId} not found`);
      const err:any = new Error('Error selecting target: no target found');
      err.translationKey = 'analytics.target.aggregates.error.not.found';
      this.targetAggregatesActions.setSelectedTargetAggregate({ error: err });
      this.globalActions.setTitle();
    }

    const title = this.translateService.instant('analytics.target.aggregates');
    this.globalActions.setTitle(title);
    this.targetAggregatesActions.setSelectedTargetAggregate(aggregateDetails);
  }
}
