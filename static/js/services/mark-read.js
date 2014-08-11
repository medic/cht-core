(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('MarkRead', ['db', 'audit', 'UserCtxService',
    function(db, audit, UserCtxService) {
      return function(messageId, read, callback) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return callback(err);
          }
          var readers = message.read || [];
          var user = UserCtxService().name;
          var index = readers.indexOf(user);
          if ((index !== -1) === read) {
            // already in the correct state
            return callback(null, message);
          }
          if (read) {
            readers.push(user);
          } else {
            readers.splice(index, 1);
          }
          message.read = readers;
          audit.saveDoc(message, function(err) {
            callback(err, message);
          });
        });
      };
    }
  ]);

}());