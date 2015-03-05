var async = require('async'),
    etagRegex = /['"]/g;

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('ImportContacts',
    ['$http', 'SaveDoc', 'BaseUrlService',
    function($http, SaveDoc, BaseUrlService) {

      var saveRecord = function(contact, create, callback) {
        if (create && contact._rev) {
          // delete _rev since this is a new doc in this database
          delete contact._rev;
        }
        SaveDoc(contact._id, contact, function(err) {
          if (err) {
            console.error('Error saving record', contact._id, err);
          }
          callback(err);
        });
      };

      return function(contacts, overwrite, callback) {
        var baseUrl = BaseUrlService() + '/_db/';
        async.each(
          contacts,
          function(contact, callback) {
            $http
              .head(baseUrl + contact._id)
              .success(function(data, status, headers) {
                var rev = headers('ETag').replace(etagRegex, '');
                if (!rev || !overwrite) {
                  // do nothing
                  return callback();
                }
                contact._rev = rev;
                saveRecord(contact, false, callback);
              })
              .error(function(data, status) {
                if (status !== 404) {
                  return callback('Error getting doc');
                }
                // for some reason, angular thinks 404 is an error...
                saveRecord(contact, true, callback);
              });
          },
          callback
        );
      };
    }
  ]);

}());
