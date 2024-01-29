const _ = require('lodash/core');

angular.module('inboxServices').factory('HydrateContactNames',
  function(
    $q,
    GetSummaries
  ) {

    'use strict';
    'ngInject';

    const findContactName = function(contactSummaries, id) {
      const cs = _.find(contactSummaries, { _id: id });
      return (cs && cs.name) || null;
    };

    const findMutedState = function(contactSummaries, id) {
      const cs = _.find(contactSummaries, { _id: id });
      return (cs && cs.muted) || false;
    };

    const replaceContactIdsWithNames = function(summaries, contactSummaries) {
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

    const getMutedState = function(summaries, contactSummaries) {
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

    const relevantIdsFromSummary = function(summary) {
      // Pull lineages as well so we can pull their names out of the summaries
      return [summary.contact].concat(summary.lineage);
    };

    /**
     * Replace contact ids with their names for ids
     */
    return function(summaries) {
      const ids = _.uniq(_.compact(_.flattenDeep(summaries.map(relevantIdsFromSummary))));
      if (!ids.length) {
        return $q.resolve(summaries);
      }

      return GetSummaries(ids)
        .then(function(response) {
          summaries = getMutedState(summaries, response);
          return replaceContactIdsWithNames(summaries, response);
        });
    };
  });
