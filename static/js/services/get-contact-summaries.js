var _ = require('underscore');

angular.module('inboxServices').factory('GetContactSummaries',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    var findContactName = function(response, id) {
      var parent = _.findWhere(response.rows, { id: id });
      return parent && parent.value.name;
    };

    var replaceContactIdsWithNames = function(summaries, response) {
      summaries.forEach(function(summary) {
        if (summary.contact) {
          summary.contact = findContactName(response, summary.contact);
        }
        summary.lineage = summary.lineage.map(function(id) {
          return findContactName(response, id);
        });
      });
      return summaries;
    };

    return function(summaries) {
      var ids = _.uniq(_.compact(_.flatten(summaries.map(function(summary) {
        return [summary.contact].concat(summary.lineage);
      }))));
      return DB()
        .query('medic-client/doc_summaries_by_id', { keys: ids })
        .then(function(response) {
          return replaceContactIdsWithNames(summaries, response);
        });
    };
  }
);
