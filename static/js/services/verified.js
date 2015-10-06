(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Verified', ['DB',
    function(DB) {
      return function(messageId, verified, callback) {
        DB.get()
          .get(messageId)
          .then(function(message) {
            message.verified = verified;
            DB.get()
              .post(message)
              .then(function() {
                callback(null, message);
              })
              .catch(function(err) {
                callback(err);
              });
          })
          .catch(function(err) {
            return callback(err);
          });
      };
    }
  ]);

}());