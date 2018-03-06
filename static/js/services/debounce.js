angular.module('inboxServices').factory('Debounce',
  function($timeout) {
    'use strict';

    return function(func, wait, maxDelay, immediate, invokeApply) {
      var timeout,
          result,
          args,
          context,
          timeoutDelayed;

      var later = function() {
        $timeout.cancel(timeoutDelayed);
        timeoutDelayed = null;
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
        }
      };

      var delayed = function() {
        timeoutDelayed = null;
        if (!immediate) {
          result = func.apply(context, args);
        }
      };

      var debounced = function() {
        context = this;
        args = arguments;

        if (timeout) {
          $timeout.cancel(timeout);
        }

        var callImmediately = immediate && !timeout;
        var callDelayed = !immediate && !timeoutDelayed && maxDelay && maxDelay > wait;

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
