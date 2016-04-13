var ETAG_REGEX = /(?:^W\/)|['"]/g;

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  /**
   * Returns the original etag from the given header value. This is
   * required because gzipping resources modifies the etag. Use this
   * service to retrieve the original etag for looking for changes.
   */
  inboxServices.factory('CleanETag', function() {
    return function(etag) {
      if (!etag) {
        return etag;
      }
      return etag.replace(ETAG_REGEX, '');
    };
  });

}());
