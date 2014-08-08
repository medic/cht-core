(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('Verified', ['db', 'audit',
    function(db, audit) {
      return function(messageId, verified) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return console.log(err);
          }
          message.verified = verified;
          audit.saveDoc(message, function(err) {
            if (err) {
              console.log(err);
            }
          });
        });
      };
    }
  ]);

}());