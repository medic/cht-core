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

    var getParams = function(id, skip) {
      return {
        reduce: false,
        descending: true,
        include_docs: true,
        skip: skip,
        limit: 50,
        startkey: [ id, {} ],
        endkey: [ id ]
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
      return GetContactSummaries(result);
    };

    var recordReadStatus = function(summaries) {
      if (!summaries.length) {
        return summaries;
      }
      var ids = summaries.map(function(summary) {
        return 'read:message:' + summary.id;
      });
      return DB({ meta: true })
        .allDocs({ keys: ids })
        .then(function(response) {
          for (var i = 0; i < summaries.length; i++) {
            summaries[i].read = !!response.rows[i].value;
          }
        })
        .then(function() {
          return summaries;
        });
    };

    return function(options) {
      options = options || {};
      var params = options.id ? getParams(options.id, options.skip) : listParams();
      return DB().query('medic-client/messages_by_contact_date', params)
        .then(function(response) {
          var result = response.rows;
          if (options.id) {
            return result;
          }
          return getSummaries(result);
        })
        .then(recordReadStatus);
    };
  }
);
