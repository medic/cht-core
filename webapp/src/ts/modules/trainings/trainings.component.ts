import { AfterContentInit, AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
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
export class TrainingsComponent implements OnInit, AfterContentInit, OnDestroy {
  private globalActions: GlobalActions;
  private trackInitialLoadPerformance;

  selectedTrainingId: null | string = null;
  subscriptions: Subscription = new Subscription();
  trainingList: TrainingMaterial[] | null | undefined = null;
  error = false;
  moreTrainings = false;
  loading = true;

  constructor(
    private readonly store: Store,
    private readonly performanceService: PerformanceService,
    private readonly trainingCardsService: TrainingCardsService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.trackInitialLoadPerformance = this.performanceService.track();
    this.subscribeToTrainingMaterials();
  }

  ngAfterContentInit() {
    this.subscribeToSelectedTraining();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.globalActions.unsetSelected();
  }

  private subscribeToTrainingMaterials() {
    const trainingSubscription = this.store
      .select(Selectors.getTrainingMaterials)
      .subscribe(forms => this.getTrainings(forms));
    this.subscriptions.add(trainingSubscription);
  }

  private subscribeToSelectedTraining() {
    const selectedTraining = this.store
      .select(Selectors.getTrainingCardFormId)
      .subscribe(id => this.selectedTrainingId = id);
    this.subscriptions.add(selectedTraining);
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
