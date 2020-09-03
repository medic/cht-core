import {Component} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';

import {FeedbackService} from '../../services/feedback.service';
import { TranslateService } from '@ngx-translate/core';
import {MmModalAbstract} from '../mm-modal/mm-modal';

@Component({
  selector: 'feedback-modal',
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent extends MmModalAbstract {
  error:{ message? } = {};
  model:{ message? } = {};

  constructor(
    public bsModalRef: BsModalRef,
    private feedbackService: FeedbackService,
    private translateService: TranslateService,
  ) {
    super();
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
            /*
             return $translate('feedback.submitted')
             .catch(() => 'feedback.submitted') // translation not found
             .then(Snackbar);
             */
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
