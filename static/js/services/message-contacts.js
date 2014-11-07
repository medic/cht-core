(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('MessageContactsRaw', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return function(params, callback) {
        $resource(BaseUrlService() + '/message_contacts', {}, {
          query: {
            isArray: false,
            params: params
          }
        }).query(
          function(res) {
            callback(null, res);
          },
          function(err) {
            callback(err);
          }
        );
      };
    }
  ]);

  var query = function(MessageContactsRaw, UserDistrict, queryOptions, conversationId, callback) {
    UserDistrict(function(err, districtId) {
      if (err) {
        return callback(err);
      }
      districtId = districtId || 'admin';
      var startkey = [ districtId ];
      var endkey = [ districtId ];
      if (conversationId) {
        startkey.push(conversationId);
        endkey.push(conversationId);
      }
      (queryOptions.descending ? startkey : endkey).push({});
      queryOptions.startkey = JSON.stringify(startkey);
      queryOptions.endkey = JSON.stringify(endkey);
      MessageContactsRaw(queryOptions, callback);
    });
  };
  
  inboxServices.factory('MessageContact', ['MessageContactsRaw', 'UserDistrict',
    function(MessageContactsRaw, UserDistrict) {
      return function(callback) {
        query(MessageContactsRaw, UserDistrict, { group_level: 2 }, null, callback);
      };
    }
  ]);
  
  inboxServices.factory('ContactConversation', ['MessageContactsRaw', 'UserDistrict',
    function(MessageContactsRaw, UserDistrict) {
      return function(options, callback) {
        var queryOptions = {
          reduce: false,
          descending: true,
          include_docs: true,
          skip: options.skip,
          limit: 50
        };
        query(MessageContactsRaw, UserDistrict, queryOptions, options.id, callback);
      };
    }
  ]);

}());