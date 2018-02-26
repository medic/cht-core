var _ = require('underscore');

// TODO: GetContactSummaries is not a name that accurately reflects what this
// does. It literally just replaces ids with names. HydrateContactSummaries?
// AddContactNames?
angular.module('inboxServices').factory('GetContactSummaries',
  function(
    $q,
    DB
  ) {

    'use strict';
    'ngInject';

    var findContactName = function(contactSummaries, id) {
      var cs = _.findWhere(contactSummaries, { id: id });
      return (cs && cs.value && cs.value.name) || null;
    };

    var replaceContactIdsWithNames = function(summaries, contactSummaries) {
      summaries.forEach(function(summary) {
        if (summary.contact) {
          summary.contact = findContactName(contactSummaries, summary.contact);
        }
        if (summary.lineage && summary.lineage.length) {
          summary.lineage = summary.lineage.map(function(id) {
            return findContactName(contactSummaries, id);
          });
        }
      });
      return summaries;
    };

    var relevantIdsFromSummary = function(summary) {
      // Pull lineages as well so we can pull their names out of the summaries
      return [summary.contact].concat(summary.lineage);
    };

    /**
     * Replace contact ids with their names for ids
     */
    return function(summaries) {
      var ids =  _.chain(summaries)
                  .map(relevantIdsFromSummary)
                  .flatten()
                  .compact()
                  .uniq()
                  .value();

      if (!ids.length) {
        return $q.resolve(summaries);
      }

      return DB()
        .query('medic-client/doc_summaries_by_id', { keys: ids })
        .then(function(response) {
          return replaceContactIdsWithNames(summaries, response.rows);
        });
    };
  }
);
