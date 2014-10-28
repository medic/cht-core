var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var updateReadStatus = function(message, user, read) {
    var readers = message.read || [];
    var index = readers.indexOf(user);
    if ((index !== -1) === read) {
      // already in the correct state
      return false;
    }
    if (read) {
      readers.push(user);
    } else {
      readers.splice(index, 1);
    }
    message.read = readers;
    return true;
  };
  
  inboxServices.factory('MarkRead', ['db', 'UserCtxService',
    function(db, UserCtxService) {
      return function(messageId, read, callback) {
        db.getDoc(messageId, function(err, message) {
          if (err) {
            return callback(err);
          }
          if (updateReadStatus(message, UserCtxService().name, read)) {
            db.saveDoc(message, function(err) {
              callback(err, message);
            });
          } else {
            callback(null, message);
          }
        });
      };
    }
  ]);
  
  inboxServices.factory('MarkAllRead', ['db', 'UserCtxService',
    function(db, UserCtxService) {
      return function(messages, read, callback) {
        var updated = _.filter(messages, function(message) {
          return updateReadStatus(message, UserCtxService().name, read);
        });
        if (updated.length) {
          db.bulkSave(updated, function(err) {
            callback(err, updated);
          });
        }
      };
    }
  ]);

}());