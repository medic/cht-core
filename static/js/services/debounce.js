angular.module('inboxServices').factory('Debounce',
  function($timeout) {
    'use strict';

    return function(func, wait, invokeApply, immediate) {
      var timeout,
          result,
          args,
          context;

      var later = function() {
        timeout = null;
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
        timeout = $timeout(later, wait, invokeApply);
        if (callImmediately) {
          result = func.apply(context, args);
        }

        return result;
      };

      debounced.cancel = function() {
        $timeout.cancel(timeout);
        timeout = null;
      };

      return debounced;
    };
  }
);
