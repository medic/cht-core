/**
 * Override AngularJS exption handler
 */
 angular.module('inboxServices').factory('$exceptionHandler',
  function(
    $injector,
    $log
  ) {

    var Feedback;

    function errorHandler(exception, cause) {
      // Resolve the dependency at runtime to avoid circular dependency
      Feedback = Feedback || $injector.get('Feedback');

      var error = { message: exception.message, stack: exception.stack, cause: cause };
      try {
        Feedback.submit(error, false, function(err) {
          if (err) {
            $log.error('Error saving feedback', err);
          }
        });
      } catch(e) {
        // stop infinite loop of exceptions
        $log.error('Error while trying to record error', JSON.stringify(error), e.toString(), e);
      }
    }
    return (errorHandler);
  }
);
