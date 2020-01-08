/**
 * Override AngularJS exception handler
 */
angular.module('inboxServices').factory('$exceptionHandler',
  function(
    $injector,
    $log
  ) {

    // Whitelist of Error messages to not automatically log to feedback
    // Can be a lower-cased partial string or a regular expression
    const NO_FEEDBACK_MESSAGES = [
      'failed to fetch'
    ];

    let Feedback;
    let last;

    const shouldGenerateFeedback = (message) => {
      if(!message){
        return false;
      }

      // don't double-log errors as a basic infinite loop defense
      if (last === message) {
        return false;
      }

      return !NO_FEEDBACK_MESSAGES.find(item =>
        item instanceof RegExp ?
          item.test(message) :
          message.toLowerCase().includes(item));
    };

    function errorHandler(exception, cause) {
      $log.error(exception, cause);
      // Resolve the dependency at runtime to avoid circular dependency
      Feedback = Feedback || $injector.get('Feedback');

      if (shouldGenerateFeedback(exception.message)) {
        last = exception.message;

        const error = { message: exception.message, stack: exception.stack, cause: cause };
        try {
          Feedback.submit(error).catch(err => {
            $log.error('Error saving feedback', err);
          });
        } catch(e) {
          // stop infinite loop of exceptions
          $log.error('Error while trying to record error', JSON.stringify(error), e.toString(), e);
        }
      }
    }
    return (errorHandler);
  }
);
