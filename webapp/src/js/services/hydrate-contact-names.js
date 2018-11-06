var _ = require('underscore');

angular.module('inboxServices').factory('HydrateContactNames',
  function(
    $q,
    GetSummaries
  ) {

    'use strict';
    'ngInject';

    var findContactName = function(contactSummaries, id) {
      var cs = _.findWhere(contactSummaries, { _id: id });
      return (cs && cs.name) || null;
    };

    var findMutedState = function(contactSummaries, id) {
      var cs = _.findWhere(contactSummaries, { _id: id });
      return (cs && cs.muted) || false;
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

    var getMutedState = function(summaries, contactSummaries) {
      summaries.forEach(function(summary) {
        if (summary.muted || !summary.lineage || !summary.lineage.length) {
          return;
        }

        summary.muted = !!summary.lineage.find(function(id) {
          return findMutedState(contactSummaries, id);
        });
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

      return GetSummaries(ids)
        .then(function(response) {
          summaries = getMutedState(summaries, response);
          return replaceContactIdsWithNames(summaries, response);
        });
    };
  }
);
