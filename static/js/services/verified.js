(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Verified', ['db', 'audit',
    function(db, audit) {
      return function(messageId, verified, callback) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return callback(err);
          }
          message.verified = verified;
          audit.saveDoc(message, function(err) {
            callback(err, message);
          });
        });
      };
    }
  ]);

}());