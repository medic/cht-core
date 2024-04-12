// TODO: consider rewriting to not support skip and limit.
// Skip and Limit are not considered fast:
//    http://docs.couchdb.org/en/latest/ddocs/views/pagination.html
//    https://github.com/medic/medic/issues/4206
const _ = require('lodash/core');
// requiring main flatten because core.flatten uses a different implementation that crashes in browsers
// https://github.com/lodash/lodash/issues/4649
_.flatten = require('lodash/flatten');
_.intersection = require('lodash/intersection');
const GenerateSearchRequests = require('./generate-search-requests');

module.exports = function(Promise, DB) {
  // Get the subset of rows, in appropriate order, according to options.
  const getPageRows = function(type, rows, options) {
    // When paginating reports, because we're calculating paging from the end of the results array,
    // if `skip` is greater than `rows.length`, `end` index of `slice` call would be a negative number.
    // This would cause this function to return the first 2 x `rows.length - `skip` resulted rows
    // instead of an empty array.
    if (rows.length < options.skip) {
      return [];
    }

    let start;
    let end;
    if (type === 'reports') {
      // descending
      end = rows.length - options.skip;
      start = end - options.limit;
      if (start < 0) {
        start = 0;
      }
    } else {
      // ascending
      start = options.skip;
      end = start + options.limit;
    }
    return _.sortBy(rows, row => 'sort' in row ? row.sort : row.value).slice(start, end);
  };

  // Get the intersection of the results of multiple search queries.
  // responses = [searchResults1, searchResult2, ...]
  // This function runs over arrays with (potentially) hundreds of thousands, if not millions, elements.
  const getIntersection = (responses) => {
    // map every searchResult by id, so we don't have to search them on the last step
    // we also remove the need of doing a _.uniq
    const responsesMapById = responses.map(response => {
      const map = {};
      response.forEach(row => map[row.id] = row);
      return map;
    });

    const intersection = _.intersection(...responsesMapById.map(Object.keys));

    // we use the last query response values for sorting by default, but we allow other responses to "pitch in"
    // used for displaying muted contacts to the bottom when sorting by last visited date
    const lastResponse = responsesMapById.pop();
    const result = intersection.map(id => {
      const row = lastResponse[id];
      responsesMapById.forEach(idMap => {
        if (idMap[id].sort) {
          row.sort = idMap[id].sort + ' ' + (row.sort || row.value);
        }
      });
      return row;
    });

    return result;
  };

  // Queries view as specified by request object coming from GenerateSearchQueries.
  // request = {view, union: true, paramSets: [params1, ...] }
  // or
  // request = {view, params: {...} }
  const queryView = function(request) {
    const paramSets = request.union ? request.paramSets : [ request.params ];
    return Promise.all(paramSets.map(function(params) {
      return DB.query(request.view, params);
    }))
      .then(function(data) {
        return _.flatten(data.map(function(datum) {
          if (request.map) {
            return datum.rows.map(request.map);
          }
          return datum.rows;
        }), true);
      });
  };

  const queryViewPaginated = function(request, options) {
    request.params = request.params || {};
    request.params.limit = options.limit;
    request.params.skip = options.skip;
    return queryView(request);
  };

  const getRows = function(type, requests, options, cacheQueryResults) {
    if (requests.length === 1 && requests[0].ordered) {
      // 1 ordered view - let the db do the pagination for us
      return queryViewPaginated(requests[0], options);
    }
    // multiple requests - have to manually paginate
    let queryResultsCache;
    return Promise.all(requests.map(queryView))
      .then(getIntersection)
      .then(function(results) {
        queryResultsCache = results;
        return getPageRows(type, results, options);
      })
      .then(function(results) {
        return cacheQueryResults ? { queryResultsCache: queryResultsCache, docIds: results } : results;
      });
  };

  return function(type, filters, options, extensions) {
    options = options || {};
    _.defaults(options, {
      limit: 50,
      skip: 0
    });

    const cacheQueryResults = GenerateSearchRequests.shouldSortByLastVisitedDate(extensions);
    let requests;
    try {
      requests = GenerateSearchRequests.generate(type, filters, extensions);
    } catch (err) {
      return Promise.reject(err);
    }

    return getRows(type, requests, options, cacheQueryResults)
      .then(function(results) {
        if (cacheQueryResults) {
          return {
            queryResultsCache: results.queryResultsCache,
            docIds: _.map(results.docIds, 'id')
          };
        }
        return {
          docIds: _.map(results, 'id')
        };
      });
  };
};

