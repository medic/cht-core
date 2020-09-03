import {Component} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {Store} from '@ngrx/store';

import { FeedbackService } from '../../services/feedback.service';
import { TranslateService } from '@ngx-translate/core';
import { MmModalAbstract } from '../mm-modal/mm-modal';
import {GlobalActions} from '../../actions/global';

@Component({
  selector: 'feedback-modal',
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent extends MmModalAbstract {
  private globalActions;
  error:{ message? } = {};
  model:{ message? } = {};

  constructor(
    public bsModalRef: BsModalRef,
    private feedbackService: FeedbackService,
    private translateService: TranslateService,
    private store: Store,
  ) {
    super();
    this.globalActions = new GlobalActions(store);
  }

  private validateMessage(message) {
    if (message) {
      this.error.message = false;
      return Promise.resolve();
    } else {
      return this
        .translateService
        .get('field is required', { field: 'Bug description' })
        .toPromise()
        .then(value => this.error.message = value);
    }
  };

  submit() {
    this.setProcessing();

    const message = this.model.message && this.model.message.trim();
    return this.validateMessage(message).then(() => {
        if (this.error.message) {
          this.setFinished();
          return;
        }

        return this.feedbackService
          .submit(message, true)
          .then(() => {
            this.setFinished();
            this.bsModalRef.hide();
            this.translateService
              .get('feedback.submitted')
              .subscribe(value => this.globalActions.setSnackbarContent(value));
          })
          .catch(err => {
            this.setError(err, 'Error saving feedback');
          })
      });
  }

  cancel() {
    this.bsModalRef.hide();
  }
}
