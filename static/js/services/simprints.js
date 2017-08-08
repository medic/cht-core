// Mask used in medic-android for separating request ID from request code
var SP_ID_MASK = 0xFFFFF8;

angular.module('inboxServices').service('Simprints',
  function(
    $q,
    $window
  ) {
    'use strict';
    'ngInject';

    var currentRequest = {};

    var request = function(endpoint) {
      /* jslint bitwise: true */
      var requestId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) & SP_ID_MASK;
      currentRequest = {
        id: requestId,
        deferred: $q.defer()
      };
      endpoint(currentRequest.id);
      return currentRequest.deferred.promise;
    };

    return {
      enabled: function() {
        return !!(
          $window.medicmobile_android &&
          $window.medicmobile_android.simprints_available &&
          $window.medicmobile_android.simprints_available()
        );
      },
      register: function() {
        return request($window.medicmobile_android.simprints_reg);
      },
      identify: function() {
        return request($window.medicmobile_android.simprints_ident);
      },
      response: function(requestId, response) {
        if (currentRequest.id !== requestId) {
          // old request - ignore
          return;
        }
        currentRequest.deferred.resolve(response);
      }
    };
  }
);
