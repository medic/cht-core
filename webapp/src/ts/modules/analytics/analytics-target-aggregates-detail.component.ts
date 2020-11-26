import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subscription, Subject } from 'rxjs';
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
export class AnalyticsTargetAggregatesDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  private targetAggregatesActions: TargetAggregatesActions;
  private globalActions: GlobalActions;
  subscriptions: Subscription = new Subscription();
  selected = null;
  error = null;
  private aggregates = null;
  private viewInited = new Subject();

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
    this.subscribeToStore();
    this.subscribeToRouteParams();
  }

  ngAfterViewInit(): void {
    this.viewInited.next(true);
    this.changeDetectorRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private subscribeToStore() {
    const subscriptionStore = combineLatest(
      this.store.select(Selectors.getTargetAggregates),
      this.store.select(Selectors.getSelectedTargetAggregate),
      this.store.select(Selectors.getTargetAggregatesError)
    ).subscribe(([aggregates, selected, error]) => {
      this.aggregates = aggregates;
      this.selected = selected;
      this.error = error;
    });
    this.subscriptions.add(subscriptionStore);
  }

  private subscribeToRouteParams() {
    const subscription = combineLatest(
      this.route.params,
      this.viewInited,
      this.store.select(Selectors.getTargetAggregatesLoaded),
    ).subscribe(([params, inited, loaded]) => {
      if (loaded && inited && params) {
        this.getAggregatesDetail(params.id);
      }
    });
    this.subscriptions.add(subscription);
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
      return;
    }

    const title = this.translateService.instant('analytics.target.aggregates');
    this.globalActions.setTitle(title);
    this.targetAggregatesActions.setSelectedTargetAggregate(aggregateDetails);
  }
}
