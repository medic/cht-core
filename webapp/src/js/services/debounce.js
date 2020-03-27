angular.module('inboxServices').factory('Debounce',
  function($timeout) {
    'use strict';

    return function(func, wait, maxDelay, immediate, invokeApply) {
      let timeout;
      let result;
      let args;
      let context;
      let timeoutDelayed;

      const later = function() {
        $timeout.cancel(timeoutDelayed);
        timeoutDelayed = null;
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
        }
      };

      const delayed = function() {
        timeoutDelayed = null;
        if (!immediate) {
          result = func.apply(context, args);
        }
      };

      const debounced = function() {
        context = this;
        args = arguments;

        if (timeout) {
          $timeout.cancel(timeout);
        }

        const callImmediately = immediate && !timeout;
        const callDelayed = !immediate && !timeoutDelayed && maxDelay && maxDelay > wait;

        timeout = $timeout(later, wait, invokeApply);
        if (callDelayed) {
          timeoutDelayed = $timeout(delayed, maxDelay, invokeApply);
        }
        if (callImmediately) {
          result = func.apply(context, args);
        }

        return result;
      };

      debounced.cancel = function() {
        $timeout.cancel(timeout);
        $timeout.cancel(timeoutDelayed);
        timeout = null;
        timeoutDelayed = null;
      };

      return debounced;
    };
  }
);
