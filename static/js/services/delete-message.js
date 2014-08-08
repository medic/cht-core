(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteMessage', ['db', 'audit',
    function(db, audit) {
      return function(messageId) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return console.log(err);
          }
          message._deleted = true;
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