var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('MessageContactsRaw', [
    'DB',
    function(DB) {
      return function(params, callback) {
        DB()
          .query('medic-client/data_records_by_contact', params)
          .then(function(res) {
            callback(null, res.rows);
          })
          .catch(function(err) {
            callback(err);
          });
      };
    }
  ]);

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

  var query = function($rootScope, MessageContactsRaw, options, callback) {
    MessageContactsRaw(generateQuery(options), function(err, results) {
      callback(err, results);
      if (!$rootScope.$$phase) {
        $rootScope.$apply();
      }
    });
  };
  
  inboxServices.factory('MessageContact', ['$rootScope', 'MessageContactsRaw',
    function($rootScope, MessageContactsRaw) {
      return function(options, callback) {
        options.targetScope = 'messages';
        options.queryOptions = { group_level: 1 };
        query($rootScope, MessageContactsRaw, options, callback);
      };
    }
  ]);
  
  inboxServices.factory('ContactConversation', ['$rootScope', 'MessageContactsRaw',
    function($rootScope, MessageContactsRaw) {
      return function(options, callback) {
        options.targetScope = 'messages.details';
        options.queryOptions = {
          reduce: false,
          descending: true,
          include_docs: true,
          skip: options.skip,
          limit: 50
        };
        query($rootScope, MessageContactsRaw, options, callback);
      };
    }
  ]);

}());
