var _ = require('underscore');

/**
 * Gets data records by the given array of ids.
 *
 * If options.include_docs is false, returns the summary, eg:
 *    {
 *      _id: 'myuuid',
 *      name: 'John Smith',
 *      type: 'person',
 *      lineage: [ 'Dunedin' ]
 *    }
 * The summary will contain different data based on the doc type,
 * as defined in the doc_summaries_by_id view.
 *
 * If options.include_docs is true, returns the full doc.
 */

angular.module('inboxServices').factory('GetDataRecords',
  function(
    $q,
    DB,
    HydrateContactNames,
    GetSubjectSummaries,
    GetSummaries
  ) {

    'use strict';
    'ngInject';

    var getDocs = function(ids) {
      return DB()
        .allDocs({ keys: ids, include_docs: true })
        .then(function(response) {
          return _.pluck(response.rows, 'doc');
        });
    };

    const getSummaries = function(ids, options) {
      const setHydratingStatus = (objs, status) => objs.forEach(obj => obj.hydrating = status);
      return GetSummaries(ids)
        .then(summaries => {
          setHydratingStatus(summaries, true);
          const hydrating = HydrateContactNames(summaries)
            .then(GetSubjectSummaries)
            .then(subjectSummaries => {
              setHydratingStatus(subjectSummaries, undefined);
              return subjectSummaries;
            });

          if (options.defer_data_records) {
            return $q.resolve({ summaries, hydrating });
          }

          return hydrating;
        });
    };

    return function(ids, options) {
      options = _.defaults(options || {}, {
        defer_data_records: false,
        include_docs: false,
      });
      if (options.include_docs && options.defer_data_records) {
        return $q.reject(new Error('Invalid GetDataRecords options defer_data_records=true and include_docs=true'));
      }
      if (!ids) {
        return $q.resolve([]);
      }
      var idsIsArray = _.isArray(ids);
      if (!idsIsArray) {
        ids = [ ids ];
      }
      if (!ids.length) {
        return $q.resolve([]);
      }

      const matchInputFormat = function(response) {
        if (!idsIsArray) {
          response = response.length ? response[0] : null;
        }
        return response;
      };

      if(options.include_docs) {
        return getDocs(ids).then(matchInputFormat);
      }

      return getSummaries(ids, options).then(matchInputFormat);
    };
  }
);
