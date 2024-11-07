import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';
import { TrainingCardsService, TrainingMaterial } from '@mm-services/training-cards.service';
import { Selectors } from '@mm-selectors/index';
import { ScrollLoaderProvider } from '@mm-providers/scroll-loader.provider';

const PAGE_SIZE = 50;

@Component({
  templateUrl: './trainings.component.html'
})
export class TrainingsComponent implements OnInit, OnDestroy {
  private globalActions: GlobalActions;
  private trackInitialLoadPerformance;
  private isInitialized;
  private trainingForms;
  selectedTrainingId: null | string = null;
  subscriptions: Subscription = new Subscription();
  trainingList: TrainingMaterial[] = [];
  moreTrainings = true;
  loading = true;

  constructor(
    private readonly store: Store,
    private readonly performanceService: PerformanceService,
    private readonly trainingCardsService: TrainingCardsService,
    private readonly scrollLoaderProvider: ScrollLoaderProvider,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.trackInitialLoadPerformance = this.performanceService.track();
    this.subscribeToTrainingMaterials();
    this.subscribeToSelectedTraining();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.globalActions.unsetSelected();
  }

  private subscribeToTrainingMaterials() {
    const trainingSubscription = this.store
      .select(Selectors.getTrainingMaterials)
      .subscribe(forms => {
        this.trainingForms = forms;
        this.isInitialized = this.getTrainings();
      });
    this.subscriptions.add(trainingSubscription);
  }

  private subscribeToSelectedTraining() {
    const selectedTraining = this.store
      .select(Selectors.getTrainingCardFormId)
      .subscribe(id => this.isInitialized?.then(() => this.selectedTrainingId = id));
    this.subscriptions.add(selectedTraining);
  }

  async getTrainings() {
    if (!this.trainingForms?.length) {
      this.loading = false;
      return;
    }

    try {
      this.loading = true;
      const list = await this.trainingCardsService.getNextTrainings(
        this.trainingForms,
        PAGE_SIZE,
        this.trainingList.length,
      ) ?? [];

      this.moreTrainings = list.length >= PAGE_SIZE;
      this.trainingList = [ ...this.trainingList, ...list ];

      await this.recordInitialLoadPerformance();
      this.initScroll();
    } catch (error) {
      console.error('Error getting training materials.', error);
    } finally {
      this.loading = false;
    }
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

  private initScroll() {
    this.scrollLoaderProvider.init(() => {
      if (!this.loading && this.moreTrainings) {
        this.getTrainings();
      }
    });
  }
}