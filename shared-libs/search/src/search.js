// TODO: consider rewriting to not support skip and limit.
// Skip and Limit are not considered fast:
//    http://docs.couchdb.org/en/latest/ddocs/views/pagination.html
//    https://github.com/medic/medic/issues/4206
const _ = require('lodash/core');
_.uniq = require('lodash/uniq');
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
  const getIntersection = (responses) => {
    const idMaps = responses.map(response => {
      const map = {};
      response.forEach(row => map[row.id] = row);
      return map;
    });
    const idsArrays = idMaps.map(Object.keys);
    const intersection = _.intersection(...idsArrays);

    const values = idMaps.pop();
    return intersection.map(id => {
      const value = values[id];
      idMaps.forEach(idMap => {
        if (idMap[id].sort) {
          value.sort = idMap[id].sort + ' ' + (value.sort || value.value);
        }
      });
      return value;
    });
  };

  // Queries view as specified by request object coming from GenerateSearchQueries.
  // request = {view, union: true, paramSets: [params1, ...] }
  // or
  // request = {view, params: {...} }
  const queryView = function(request) {
    const paramSets = request.union ? request.paramSets : [ request.params ];
    return Promise
      .all(paramSets.map((params) => DB.query(request.view, params)))
      .then(resultSets => resultSets.reduce((result, resultSet) => {
        if (request.map) {
          return result.concat(resultSet.rows.map(request.map));
        }
        return result.concat(resultSet.rows);
      }, []));
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
        } else {
          return {
            docIds: _.map(results, 'id')
          };
        }
      });
  };
};

