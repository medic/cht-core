// Mask used in medic-android for separating request ID from request code
var SP_ID_MASK = 0xFFFFF8,

// TIER_1, TIER_2, and TIER_3 are considered a match
// TIER_4, and TIER_5 are considered no match
// https://sites.google.com/simprints.com/simprints-for-developers/custom-integrations/tiers
    MAX_TIER = 3;

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

    var isCurrentRequest = function(requestId) {
      return currentRequest.id === requestId;
    };

    var parseTierNumber = function(tier) {
      return Number.parseInt(tier.split('_')[1]);
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
      registerResponse: function(requestId, response) {
        if (isCurrentRequest(requestId)) {
          currentRequest.deferred.resolve(response.id);
        }
      },
      identify: function() {
        return request($window.medicmobile_android.simprints_ident);
      },
      identifyResponse: function(requestId, identities) {
        if (isCurrentRequest(requestId)) {
          identities.forEach(function(identity) {
            // Tier from TIER_1 (best) to TIER_5 (worst)
            identity.tierNumber = parseTierNumber(identity.tier);
          });
          identities = identities.filter(function(identity) {
            return identity.tierNumber <= MAX_TIER;
          });
          currentRequest.deferred.resolve(identities);
        }
      }
    };
  }
);
