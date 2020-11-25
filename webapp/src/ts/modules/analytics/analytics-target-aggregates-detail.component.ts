import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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
  private aggregates = null;
  selected = null;
  error = null;
  // Defaulting value so initially it'll be different from route's params and show content section
  private paramTargetId = null;
  private shouldLoadDetail;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private targetAggregatesService: TargetAggregatesService,
    private translateService: TranslateService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.targetAggregatesActions = new TargetAggregatesActions(store);
    this.globalActions = new GlobalActions(store);
  }

  ngOnInit(): void {
    const subscription = combineLatest(
      this.route.params,
      this.store.select(Selectors.getTargetAggregates),
      this.store.select(Selectors.getSelectedTargetAggregate),
      this.store.select(Selectors.getTargetAggregatesError),
    )
      .subscribe(([
        params,
        aggregates,
        selected,
        error
      ]) => {
        this.selected = selected;
        this.error = error;
        this.aggregates = aggregates;
        this.shouldLoadDetail = this.paramTargetId !== params.id;
        this.paramTargetId = params.id;
        this.getAggregatesDetail(this.paramTargetId);
        this.changeDetectorRef.detectChanges();
      });
    this.subscriptions.add(subscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getAggregatesDetail(aggregateId) {
    if (!this.aggregates || !this.shouldLoadDetail) {
      return;
    }

    this.shouldLoadDetail = false;

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
      return;
    }

    const title = this.translateService.instant('analytics.target.aggregates');
    this.globalActions.setTitle(title);
    this.targetAggregatesActions.setSelectedTargetAggregate(aggregateDetails);
  }
}
