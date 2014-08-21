(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('MessageContacts', ['$resource', 'BaseUrlService',
    function($resource, BaseUrlService) {
      return function(districtId, contactId, callback) {
        districtId = districtId || 'admin';
        var params;
        if (contactId) {
          params = {
            reduce: false,
            include_docs: true,
            key: '["' + districtId + '","' + contactId + '"]'
          };
        } else {
          params = {
            group: true,
            startkey: '["' + districtId + '"]',
            endkey: '["' + districtId + '",{}]'
          };
        }
        $resource(BaseUrlService() + '/message_contacts', {}, {
          query: {
            isArray: false,
            params: params
          }
        }).query(function(res) {
          callback(null, res.rows);
        });
      };
    }
  ]);

}());