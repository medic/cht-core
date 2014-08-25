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
        }).query(function(res) {
          callback(null, res);
        });
      };
    }
  ]);
  
  inboxServices.factory('MessageContact', ['MessageContactsRaw',
    function(MessageContactsRaw) {
      return function(districtId, callback) {
        districtId = districtId || 'admin';
        MessageContactsRaw({
          group_level: 2,
          startkey: '["' + districtId + '"]',
          endkey: '["' + districtId + '",{}]'
        }, callback);
      };
    }
  ]);
  
  inboxServices.factory('ContactConversation', ['MessageContactsRaw',
    function(MessageContactsRaw) {
      return function(districtId, contactId, skip, callback) {
        districtId = districtId || 'admin';
        MessageContactsRaw({
          reduce: false,
          descending: true,
          include_docs: true,
          skip: skip,
          limit: 50,
          endkey: '["' + districtId + '","' + contactId + '"]',
          startkey: '["' + districtId + '","' + contactId + '",{}]'
        }, callback);
      };
    }
  ]);

}());