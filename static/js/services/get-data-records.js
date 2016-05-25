var _ = require('underscore');

/**
 * Gets data records by the given array of ids.
 *
 * If options.include_docs is false, returns the summary, eg:
 *    {
 *      _id: 'myuuid',
 *      name: 'John Smith',
 *      type: 'person',
 *      place: [ 'Dunedin' ]
 *    }
 * The summary will contain different data based on the doc type,
 * as defined in the doc_summaries_by_id view.
 *
 * If options.include_docs is true, returns the full doc.
 */
(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('GetDataRecords',
    function(
      $q,
      DB
    ) {

      'ngInject';

      var getDocs = function(ids) {
        return DB.get()
          .allDocs({ keys: ids, include_docs: true })
          .then(function(response) {
            return _.pluck(response.rows, 'doc');
          });
      };

      var getSummaries = function(ids) {
        ids = ids.map(function(id) {
          return [ id ];
        });
        return DB.get()
          .query('medic/doc_summaries_by_id', { keys: ids })
          .then(function(response) {
            return _.map(response.rows, function(row) {
              row.value._id = row.id;
              return row.value;
            });
          });
      };

      return function(ids, options) {
        if (!ids) {
          return $q.resolve([]);
        }
        var arrayGiven = _.isArray(ids);
        if (!arrayGiven) {
          ids = [ ids ];
        }
        if (!ids.length) {
          return $q.resolve([]);
        }
        var getFn = options && options.include_docs ? getDocs : getSummaries;
        return getFn(ids)
          .then(function(response) {
            if (!arrayGiven) {
              response = response.length ? response[0] : null;
            }
            return response;
          });
      };
    }
  );

}());
