var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var generateQuery = function(options) {
    var query = _.clone(options.queryOptions);
    query.startkey = [ ];
    query.endkey = [ ];
    if (options.id) {
      query.startkey.push(options.id);
      query.endkey.push(options.id);
    }
    (query.descending ? query.startkey : query.endkey).push({});
    return query;
  };

  var query = function(DB, options) {
    var params = generateQuery(options);
    return DB()
      .query('medic-client/data_records_by_contact', params)
      .then(function(res) {
        return res.rows;
      });
  };
  
  inboxServices.factory('MessageContact',
    function(
      DB
    ) {
      'ngInject';
      return function(options) {
        options.targetScope = 'messages';
        options.queryOptions = { group_level: 1 };
        return query(DB, options);
      };
    }
  );
  
  inboxServices.factory('ContactConversation',
    function(
      DB
    ) {
      'ngInject';
      return function(options) {
        options.targetScope = 'messages.details';
        options.queryOptions = {
          reduce: false,
          descending: true,
          include_docs: true,
          skip: options.skip,
          limit: 50
        };
        return query(DB, options);
      };
    }
  );

}());
