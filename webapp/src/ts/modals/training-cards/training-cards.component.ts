import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';

@Component({
  selector: 'training-cards-modal',
  templateUrl: './training-cards.component.html'
})
export class TrainingCardsComponent implements OnInit, OnDestroy {
  readonly MODAL_ID = 'training-cards-modal';
  private globalActions: GlobalActions;
  hideModalFooter = true; // ToDo fix
  showConfirmExit = false;
  subscriptions: Subscription = new Subscription();

  constructor(
    private readonly store: Store,
    private readonly router: Router,
    private readonly matDialogRef: MatDialogRef<TrainingCardsComponent>,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.globalActions.setTrainingCard({ isOpen: true });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.clearTrainingCardStore();
  }

  private clearTrainingCardStore() {
    this.globalActions.setTrainingCard({
      formId: null,
      isOpen: false,
      showConfirmExit: false,
      nextUrl: null,
    });
  }

  private subscribeToStore() {
    const reduxSubscription = this.store
      .select(Selectors.getTrainingCard)
      .subscribe(trainingCard => this.showConfirmExit = trainingCard.showConfirmExit);
    this.subscriptions.add(reduxSubscription);
  }

  close() {
    this.matDialogRef.close();
    this.clearTrainingCardStore();
  }

  continueTraining() {
    this.globalActions.setTrainingCard({ showConfirmExit: false });
  }

  exitTraining(nextUrl: string) {
    // ToDo this.recordPerformanceQuitTraining();

    if (nextUrl) {
      this.router.navigateByUrl(nextUrl);
    }
    this.close();
  }

  quit(showConfirmExit: boolean) {
    if (showConfirmExit) { // todo not show confirmation if there is an error in the form
      this.globalActions.setTrainingCard({ showConfirmExit });
      return;
    }
    this.close();
  }
}
