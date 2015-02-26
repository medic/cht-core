(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteMessage', ['db',
    function(db) {
      return function(messageId, callback) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return callback(err);
          }
          message._deleted = true;
          db.saveDoc(message, function(err) {
            callback(err, message);
          });
        });
      };
    }
  ]);

}());