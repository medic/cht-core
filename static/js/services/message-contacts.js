var async = require('async'),
    _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('MessageContactsRaw', [
    'pouchDB',
    function(pouchDB) {
      return function(params, callback, targetScope) {
        pouchDB('medic').query('medic/data_records_by_contact', params)
          .then(function(res) {
            callback(null, res.rows);
          })
          .catch(function(err) {
            callback(err);
          });
      };
    }
  ]);

  var generateQuery = function(options, districtId) {
    var query = _.clone(options.queryOptions);
    query.startkey = [ districtId ];
    query.endkey = [ districtId ];
    if (options.id) {
      query.startkey.push(options.id);
      query.endkey.push(options.id);
    }
    (options.queryOptions.descending ? query.startkey : query.endkey).push({});
    return query;
  };

  var query = function($rootScope, MessageContactsRaw, UserDistrict, Settings, options, callback) {
    async.auto({
      district: function(callback) {
        UserDistrict(callback);
      },
      request: ['district', function(callback, results) {
        var query = generateQuery(options, results.district || 'admin');
        MessageContactsRaw(query, callback, options.targetScope);
      }],
      unallocated: function(callback) {
        if (!options.districtAdmin) {
          return callback(null, false);
        }
        Settings(function(err, settings) {
          var result = settings && settings.district_admins_access_unallocated_messages;
          callback(err, result);
        });
      },
      requestUnallocated: ['unallocated', function(callback, results) {
        if (!results.unallocated) {
          return callback();
        }
        MessageContactsRaw(generateQuery(options, 'none'), callback, options.targetScope);
      }]
    }, function(err, results) {
      var merged;
      if (results.request && results.requestUnallocated) {
        merged = results.request.concat(results.requestUnallocated);
      } else {
        merged = results.request;
      }
      callback(err, merged);
      if (!$rootScope.$$phase) {
        $rootScope.$apply();
      }
    });
  };
  
  inboxServices.factory('MessageContact', ['$rootScope', 'MessageContactsRaw', 'UserDistrict', 'Settings',
    function($rootScope, MessageContactsRaw, UserDistrict, Settings) {
      return function(options, callback) {
        options.targetScope = 'messages';
        options.queryOptions = { group_level: 2 };
        query($rootScope, MessageContactsRaw, UserDistrict, Settings, options, callback);
      };
    }
  ]);
  
  inboxServices.factory('ContactConversation', ['$rootScope', 'MessageContactsRaw', 'UserDistrict', 'Settings',
    function($rootScope, MessageContactsRaw, UserDistrict, Settings) {
      return function(options, callback) {
        options.targetScope = 'messages.details';
        options.queryOptions = {
          reduce: false,
          descending: true,
          include_docs: true,
          skip: options.skip,
          limit: 50
        };
        query($rootScope, MessageContactsRaw, UserDistrict, Settings, options, callback);
      };
    }
  ]);

}());
