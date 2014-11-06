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
  
  inboxServices.factory('MessageContact', ['MessageContactsRaw', 'UserDistrict',
    function(MessageContactsRaw, UserDistrict) {
      return function(callback) {
        UserDistrict(function(err, districtId) {
          if (err) {
            return callback(err);
          }
          districtId = districtId || 'admin';
          MessageContactsRaw({
            group_level: 2,
            startkey: '["' + districtId + '"]',
            endkey: '["' + districtId + '",{}]'
          }, callback);
        });
      };
    }
  ]);
  
  inboxServices.factory('ContactConversation', ['MessageContactsRaw', 'UserDistrict',
    function(MessageContactsRaw, UserDistrict) {
      return function(options, callback) {
        UserDistrict(function(err, districtId) {
          if (err) {
            return callback(err);
          }
          districtId = districtId || 'admin';
          MessageContactsRaw({
            reduce: false,
            descending: true,
            include_docs: true,
            skip: options.skip,
            limit: 50,
            endkey: '["' + districtId + '","' + options.id + '"]',
            startkey: '["' + districtId + '","' + options.id + '",{}]'
          }, callback);
        });
      };
    }
  ]);

}());