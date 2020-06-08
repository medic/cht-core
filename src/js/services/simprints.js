// Mask used in medic-android for separating request ID from request code
const SP_ID_MASK = 0xFFFFF8;

// TIER_1, TIER_2, and TIER_3 are considered a match
// TIER_4, and TIER_5 are considered no match
// https://sites.google.com/simprints.com/simprints-for-developers/custom-integrations/tiers
const MAX_TIER = 3;

angular.module('inboxServices').service('Simprints',
  function(
    $log,
    $q,
    $window
  ) {
    'use strict';
    'ngInject';

    let currentRequest = {};

    const request = function(endpoint) {
      /* eslint-disable-next-line no-bitwise */
      const requestId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) & SP_ID_MASK;
      currentRequest = {
        id: requestId,
        deferred: $q.defer()
      };
      // `call` needed to specify context: #3511
      endpoint.call($window.medicmobile_android, currentRequest.id);
      return currentRequest.deferred.promise;
    };

    const isCurrentRequest = function(requestId) {
      return currentRequest.id === requestId;
    };

    const parseTierNumber = function(tier) {
      return Number.parseInt(tier.split('_')[1]);
    };

    return {
      enabled: function() {
        try {
          return !!(
            $window.medicmobile_android &&
            typeof $window.medicmobile_android.simprints_available === 'function' &&
            $window.medicmobile_android.simprints_available()
          );
        } catch (err) {
          $log.error(err);
          return false;
        }
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
