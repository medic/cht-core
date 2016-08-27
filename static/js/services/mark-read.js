var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  var updateDoc = function(user, read, doc) {
    var readers = doc.read || [];
    var index = readers.indexOf(user);
    if ((index !== -1) === read) {
      // already in the correct state
      return;
    }
    if (read) {
      readers.push(user);
    } else {
      readers.splice(index, 1);
    }
    doc.read = readers;
    return doc;
  };

  var updatDocs = function(user, read, docs) {
    return _.compact(_.map(docs, _.partial(updateDoc, user, read)));
  };

  inboxServices.factory('MarkRead', ['DB', 'Session',
    function(DB, Session) {
      return function(docId, read) {
        var user = Session.userCtx().name;
        return DB()
          .get(docId)
          .then(_.partial(updateDoc, user, read))
          .then(function(doc) {
            if (!doc) {
              return;
            }
            return DB().put(doc);
          });
      };
    }
  ]);

  inboxServices.factory('MarkAllRead', ['DB', 'Session',
    function(DB, Session) {
      return function(docs, read) {
        var user = Session.userCtx().name;
        var updated = updatDocs(user, read, docs);
        // Conflicts will fail silently. That's ok.
        return DB().bulkDocs(updated);
      };
    }
  ]);

}());
