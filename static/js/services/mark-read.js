var _ = require('underscore');

angular.module('inboxServices').factory('MarkRead', function(
  $q,
  DB,
  Session
) {

  'use strict';
  'ngInject';

  var updateDoc = function(user, doc) {
    var readers = doc.read || [];
    var index = readers.indexOf(user);
    if (index !== -1) {
      // already marked as read
      return;
    }
    readers.push(user);
    doc.read = readers;
    return doc;
  };

  var updateDocs = function(user, docs) {
    return _.compact(_.map(docs, _.partial(updateDoc, user)));
  };

  return function(docs) {
    var user = Session.userCtx().name;
    var updated = updateDocs(user, docs);
    // Conflicts will fail silently. That's ok.
    if (!updated.length) {
      return $q.resolve();
    }
    return DB().bulkDocs(updated);
  };
});
