(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');
  
  inboxServices.factory('MarkRead', ['db', 'audit', 'UserCtxService',
    function(db, audit, UserCtxService) {
      return function(messageId, read) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return console.log(err);
          }
          if (!message.read) {
              message.read = [];
          }
          var user = UserCtxService().name;
          var index = message.read.indexOf(user);
          if ((index !== -1) === read) {
              // nothing to update, return without calling callback
              return;
          }
          if (read) {
              message.read.push(user);
          } else {
              message.read.splice(index, 1);
          }
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