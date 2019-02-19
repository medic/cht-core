var feedback = require('../modules/feedback');

/**
 * Override AngularJS exption handler
 */
 angular.module('inboxServices').factory('$exceptionHandler',
  function($log, $window) {
    function errorHandler(exception, cause) {
      var error = { message: exception.message, stack: exception.stack, cause: cause };
      try {
        feedback.submit(error, false, function(err) {
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