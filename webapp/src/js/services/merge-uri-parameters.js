const _ = require('lodash');

angular.module('inboxServices').factory('MergeUriParameters',
  function(
    $httpParamSerializer
  ) {
    'use strict';
    'ngInject';

    // converts the given uri to a Location object
    // https://developer.mozilla.org/en-US/docs/Web/API/Location
    const parse = function(uri) {
      const parser = document.createElement('a');
      parser.href = uri;
      return parser;
    };

    // splits the search in the given location into a map of params
    const getParams = function(location) {
      const result = {};
      if (location.search && location.search.length) {
        const search = location.search.substr(1);
        search.split('&').forEach(function(part) {
          const item = part.split('=');
          result[item[0]] = decodeURIComponent(item[1]);
        });
      }
      return result;
    };

    /**
     * Set http parameters in the given `uri` with the given `defaults`
     * map. Existing parameters in the uri are not modified. Returns
     * the new uri as a string.
     */
    return function(uri, defaults) {
      const location = parse(uri);
      const existing = getParams(location);
      _.defaults(existing, defaults);
      return location.pathname + '?' + $httpParamSerializer(existing);
    };
  }
);
