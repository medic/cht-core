(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Verified', ['db',
    function(db) {
      return function(messageId, verified, callback) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return callback(err);
          }
          message.verified = verified;
          db.saveDoc(message, function(err) {
            callback(err, message);
          });
        });
      };
    }
  ]);

}());