angular.module('inboxServices').factory('MessageContacts',
  function(
    DB,
    GetContactSummaries
  ) {
    'use strict';
    'ngInject';

    var listParams = function() {
      return {
        group_level: 1,
        startkey: [],
        endkey: [{}]
      };
    };

    var getParams = function(options) {
      return {
        reduce: false,
        descending: true,
        include_docs: true,
        skip: options.skip,
        limit: 50,
        startkey: [ options.id, {} ],
        endkey: [ options.id ]
      };
    };

    var getSummaries = function(result) {
      // set the key
      result = result.map(function(item) {
        var value = item.value;
        value.from = value.key = item.key[0];
        return value;
      });
      // populate the summaries of the result values then return the result
      return GetContactSummaries(result).then(function() {
        return result;
      });
    };

    return function(options) {
      options = options || {};
      var params = options.id ? getParams(options) : listParams();
      return DB().query('medic-client/messages_by_contact_date', params)
        .then(function(response) {
          var result = response.rows;
          if (options.id) {
            return result;
          }
          return getSummaries(result);
        });
    };
  }
);
