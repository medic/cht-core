import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';
import { PerformanceService } from '@mm-services/performance.service';

@Component({
  selector: 'training-cards-modal',
  templateUrl: './training-cards.component.html'
})
export class TrainingCardsComponent implements OnInit, OnDestroy {
  readonly MODAL_ID = 'training-cards-modal';
  private readonly globalActions: GlobalActions;
  private trackRender;
  private trainingCardID;
  hasError = false;
  showConfirmExit = false;
  subscriptions: Subscription = new Subscription();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly matDialogRef: MatDialogRef<TrainingCardsComponent>,
    private readonly performanceService: PerformanceService,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.trackRender = this.performanceService.track();
    this.subscribeToStore();
    this.globalActions.setTrainingCard({ isOpen: true });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.globalActions.clearTrainingCard();
  }

  private subscribeToStore() {
    const subscription = combineLatest([
      this.store.select(Selectors.getTrainingCard),
      this.store.select(Selectors.getTrainingCardFormId),
    ]).subscribe(([trainingCard, trainingCardID]) => {
      this.showConfirmExit = trainingCard.showConfirmExit;
      this.trainingCardID = trainingCardID;
    });
    this.subscriptions.add(subscription);
  }

  close() {
    this.matDialogRef.close();
    this.globalActions.clearTrainingCard();
  }

  continueTraining() {
    this.globalActions.setTrainingCard({ showConfirmExit: false });
  }

  exitTraining(nextUrl: string) {
    this.trackRender?.stop({
      name: [ 'enketo', this.trainingCardID, 'add', 'quit' ].join(':'),
    });

    if (nextUrl) {
      this.router.navigateByUrl(nextUrl);
    }

    this.close();
  }

  quit() {
    if (!this.hasError) {
      this.globalActions.setTrainingCard({ showConfirmExit: true });
      return;
    }
    this.close();
  }
}
