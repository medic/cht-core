/**
 * Override Angular exception handler
 */
import { ErrorHandler, Injectable } from '@angular/core';
import { FeedbackService } from '../services/feedback.service';

@Injectable()
export class ExceptionHandlerProvider implements ErrorHandler {
  // List of Error messages to not automatically log to feedback
  // Can be a lower-cased partial string or a regular expression
  private readonly NO_FEEDBACK_MESSAGES = [
    'failed to fetch'
  ];

  private last;

  constructor(
    private feedbackService:FeedbackService,
  ) {
  }

  private shouldGenerateFeedback(message) {
    if (!message){
      return false;
    }

    // don't double-log errors as a basic infinite loop defense
    if (this.last === message) {
      return false;
    }

    return !this.NO_FEEDBACK_MESSAGES.find((item:any) =>
      item instanceof RegExp ?
        item.test(message) :
        message.toLowerCase().includes(item));
  }

  handleError(exception: any) {
    console.error(exception);

    if (this.shouldGenerateFeedback(exception.message)) {
      this.last = exception.message;

      const error = { message: exception.message, stack: exception.stack };
      try {
        this.feedbackService.submit(error).catch(err => {
          console.error('Error saving feedback', err);
        });
      } catch (e) {
        // stop infinite loop of exceptions
        console.error('Error while trying to record error', JSON.stringify(error), e.toString(), e);
      }
    }
  }
}
