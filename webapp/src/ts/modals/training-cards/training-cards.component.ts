import { Component, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

import { Selectors } from '@mm-selectors/index';
import { GlobalActions } from '@mm-actions/global';

@Component({
  selector: 'training-cards-modal',
  templateUrl: './training-cards.component.html'
})
export class TrainingCardsComponent implements OnInit, OnDestroy {

  static id = 'training-cards-modal';
  private globalActions;
  modalTitleKey = 'training_cards.modal.title';
  hideModalFooter = true;
  showConfirmExit;
  nextUrl;
  subscriptions: Subscription = new Subscription();

  constructor(
    private store: Store,
    private matDialogRef: MatDialogRef<TrainingCardsComponent>,
  ) {
    this.globalActions = new GlobalActions(this.store);
  }

  ngOnInit() {
    this.subscribeToStore();
    this.globalActions.setTrainingCard({ isOpen: true });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.globalActions.setTrainingCard({ formId: null, isOpen: false, showConfirmExit: false, nextUrl: null });
  }

  private subscribeToStore() {
    const reduxSubscription = this.store
      .select(Selectors.getTrainingCard)
      .subscribe(trainingCard => {
        this.showConfirmExit = trainingCard.showConfirmExit;
        this.nextUrl = trainingCard.nextUrl;
      });
    this.subscriptions.add(reduxSubscription);
  }

  /*setError(error) {
    this.errorTranslationKey = error?.translationKey || 'training_cards.error.loading';
    this.loadingContent = false;
    this.hideModalFooter = false;
    this.contentError = true;
  }*/

  close() {
    this.globalActions.setTrainingCard({ formId: null, isOpen: false, showConfirmExit: false, nextUrl: null });
    this.matDialogRef.close();
  }

  /* private recordPerformanceQuitTraining() {
    this.trackEditDuration?.stop({
      name: [ 'enketo', this.trackMetadata.form, this.trackMetadata.action, 'quit' ].join(':'),
    });
  }*/

  /* confirmExit(confirm) {
    if (this.contentError) {
      this.close();
      return;
    }
    this.showConfirmExit = confirm;
  }*/

  /*quitTraining() {
    this.recordPerformanceQuitTraining();

    if (this.nextUrl) {
      this.router.navigateByUrl(this.nextUrl);
    }

    this.close();
  }*/

  save() {
    this.close();
  }

  quit(showConfirmMessage) {
    // ToDo showConfirmMessage
    console.warn('showConfirmMessage', showConfirmMessage);
  }
}
