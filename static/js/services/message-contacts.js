var async = require('async'),
    _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('MessageContactsRaw', [
    'HttpWrapper', 'BaseUrlService',
    function(HttpWrapper, BaseUrlService) {
      return function(params, callback, targetScope) {
        var url = BaseUrlService() + '/message_contacts';
        HttpWrapper.get(url, { params: params, targetScope: targetScope })
          .success(function(res) {
            callback(null, res.rows);
          })
          .error(function(data, status) {
            if(status === 0) {
              // request failed unnaturally.  It was probably cancelled by a
              // state change, so we can safely ignore it.
              return;
            }
            callback(new Error(data));
          });
      };
    }
  ]);

  var generateQuery = function(options, districtId) {
    var startkey = [ districtId ];
    var endkey = [ districtId ];
    if (options.id) {
      startkey.push(options.id);
      endkey.push(options.id);
    }
    (options.queryOptions.descending ? startkey : endkey).push({});

    var query = _.clone(options.queryOptions);
    query.startkey = JSON.stringify(startkey);
    query.endkey = JSON.stringify(endkey);
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
        options.targetScope = "messages";
        options.queryOptions = { group_level: 2 };
        query($rootScope, MessageContactsRaw, UserDistrict, Settings, options, callback);
      };
    }
  ]);
  
  inboxServices.factory('ContactConversation', ['$rootScope', 'MessageContactsRaw', 'UserDistrict', 'Settings',
    function($rootScope, MessageContactsRaw, UserDistrict, Settings) {
      return function(options, callback) {
        options.targetScope = "messages.details";
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
