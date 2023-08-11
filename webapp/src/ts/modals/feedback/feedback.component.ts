import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';

import { FeedbackService } from '@mm-services/feedback.service';
import { GlobalActions } from '@mm-actions/global';
import { TranslateService } from '@mm-services/translate.service';

@Component({
  selector: 'feedback-modal',
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent {
  private globalActions;
  processing = false;
  errors:{ message?; submit? } = {};
  model:{ message? } = {};

  static id = 'feedback-modal';

  constructor(
    private feedbackService: FeedbackService,
    private store: Store,
    private translateService: TranslateService,
    private matDialogRef: MatDialogRef<FeedbackComponent>,
  ) {
    this.globalActions = new GlobalActions(store);
  }

  private validateMessage(message) {
    if (message) {
      this.errors.message = false;
      return Promise.resolve();
    }
    return this.translateService
      .fieldIsRequired('Bug description')
      .then(value => this.errors.message = value);
  }

  close() {
    this.matDialogRef.close();
  }

  submit() {
    this.processing = true;

    const message = this.model?.message?.trim();
    return this
      .validateMessage(message)
      .then(() => {
        if (this.errors.message) {
          return;
        }

        return this.feedbackService
          .submit(message, true)
          .then(() => {
            this.close();
            this.translateService
              .get('feedback.submitted')
              .then(value => this.globalActions.setSnackbarContent(value));
          })
          .catch(error => {
            this.errors.submit = 'Error saving feedback';
            console.error(this.errors.submit, error);
          });
      })
      .finally(() => this.processing = false);
  }
}
