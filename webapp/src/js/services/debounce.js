angular.module('inboxServices').factory('Debounce',
  function($timeout) {
    'use strict';

    return (func, wait = 0, maxDelay = 0, immediate = false, invokeApply = false) => {
      let timeout;
      let result;
      let args;
      let context;
      let timeoutDelayed;
      let executed = false;
      let cancelled = false;

      if (typeof func !== 'function') {
        throw new Error('First argument must be a function');
      }

      if (isNaN(wait) || wait < 0) {
        throw new Error('wait must be a number greater than 0');
      }

      if (isNaN(maxDelay) || maxDelay < 0) {
        throw new Error('maxDelay must be a number greater than 0');
      }

      const later = function() {
        $timeout.cancel(timeoutDelayed);
        timeoutDelayed = null;
        timeout = null;
        if (!immediate) {
          executed = true;
          result = func.apply(context, args);
        }
      };

      const delayed = function() {
        timeoutDelayed = null;
        if (!immediate) {
          executed = true;
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
          executed = true;
          result = func.apply(context, args);
        }

        return result;
      };

      debounced.cancel = () => {
        $timeout.cancel(timeout);
        $timeout.cancel(timeoutDelayed);
        timeout = null;
        timeoutDelayed = null;
        cancelled = true;
      };

      debounced.executed = () => executed;
      debounced.cancelled = () => cancelled;

      
      return debounced;
    };
  }
);
