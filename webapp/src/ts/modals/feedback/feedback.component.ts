import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Store } from '@ngrx/store';

import { FeedbackService } from '@mm-services/feedback.service';
import { MmModalAbstract } from '../mm-modal/mm-modal';
import { GlobalActions } from '@mm-actions/global';
import { TranslateService } from '@mm-services/translate.service';

@Component({
  selector: 'feedback-modal',
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent extends MmModalAbstract {
  private globalActions;
  error:{ message? } = {};
  model:{ message? } = {};

  static id = 'feedback-modal';

  constructor(
    bsModalRef: BsModalRef,
    private feedbackService: FeedbackService,
    private store: Store,
    private translateService:TranslateService,
  ) {
    super(bsModalRef);
    this.globalActions = new GlobalActions(store);
  }

  private validateMessage(message) {
    if (message) {
      this.error.message = false;
      return Promise.resolve();
    } else {
      return this.translateService
        .fieldIsRequired('Bug description')
        .then(value => this.error.message = value);
    }
  }

  submit() {
    this.setProcessing();

    const message = this.model.message && this.model.message.trim();
    return this
      .validateMessage(message)
      .then(() => {
        if (this.error.message) {
          this.setFinished();
          return;
        }

        return this.feedbackService
          .submit(message, true)
          .then(() => {
            this.setFinished();
            this.close();
            this.translateService
              .get('feedback.submitted')
              .then(value => this.globalActions.setSnackbarContent(value));
          })
          .catch(err => {
            this.setError(err, 'Error saving feedback');
          });
      });
  }
}
