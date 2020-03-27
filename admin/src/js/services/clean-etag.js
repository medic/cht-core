const ETAG_REGEX = /(?:^W\/)|['"]/g;

/**
 * Returns the original etag from the given header value. This is
 * required because gzipping resources modifies the etag. Use this
 * service to retrieve the original etag for looking for changes.
 */
angular.module('services').factory('CleanETag', function() {
  'use strict';
  return function(etag) {
    if (!etag) {
      return etag;
    }
    return etag.replace(ETAG_REGEX, '');
  };
});
