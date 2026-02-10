const summarise = require('@medic/doc-summaries');

angular.module('inboxServices').factory('GetSummaries',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    return ids => {
      if (!ids || !ids.length) {
        return $q.resolve([]);
      }
      return DB().allDocs({ keys: ids, include_docs: true }).then(response => {
        return response.rows
          .map(row => summarise(row.doc))
          .filter(summary => summary);
      });
    };
  });
