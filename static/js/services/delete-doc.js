(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteDoc', ['db',
    function(db) {
      return function(docId, callback) {
        db.getDoc(docId, function(err, doc) {
          if (err) {
            return callback(err);
          }
          doc._deleted = true;
          db.saveDoc(doc, function(err) {
            callback(err, doc);
          });
        });
      };
    }
  ]);

}());