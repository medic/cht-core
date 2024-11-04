import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { TrainingCardsService, TrainingMaterial } from '@mm-services/training-cards.service';
import { Selectors } from '@mm-selectors/index';

// const PAGE_SIZE = 50; // ToDo -- add pagination

@Component({
  templateUrl: './trainings.component.html'
})
export class TrainingsComponent implements OnInit, OnDestroy {
  private globalActions: GlobalActions;
  private trackInitialLoadPerformance;

  selectedTrainingId;
  subscriptions: Subscription = new Subscription();
  trainingList: TrainingMaterial[] | null | undefined = null;
  error = false;
  moreTrainings = false;
  loading = true;

  constructor(
    private readonly store: Store,
    private readonly route: ActivatedRoute,
    private readonly performanceService: PerformanceService,
    private readonly trainingCardsService: TrainingCardsService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.trackInitialLoadPerformance = this.performanceService.track();
    this.subscribeToRouteParams();
    this.subscribeToStore();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.globalActions.unsetSelected();
  }

  private subscribeToStore() {
    const trainingSubscription = this.store
      .select(Selectors.getTrainingMaterials)
      .subscribe(forms => this.getTrainings(forms));
    this.subscriptions.add(trainingSubscription);
  }

  private subscribeToRouteParams() {
    const routeSubscription = this.route.firstChild?.params.subscribe(params => {
      this.selectedTrainingId = params?.id;
    });
    this.subscriptions.add(routeSubscription);
  }

  async getTrainings(forms) {
    this.trainingList = await this.trainingCardsService.getAllAvailableTrainings(forms);
    this.loading = false;
    await this.recordInitialLoadPerformance();
  }

  private async recordInitialLoadPerformance() {
    if (!this.trackInitialLoadPerformance) {
      return;
    }
    await this.trackInitialLoadPerformance.stop({ name: 'training_materials_list:load', recordApdex: true });
    this.trackInitialLoadPerformance = null;
  }

  trackBy(index, training) {
    return training._id + training._rev + training.selected;
  }
}
