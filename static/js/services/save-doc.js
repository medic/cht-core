var _ = require('underscore');
// TODO delete me
(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('SaveDoc', ['db',
    function(db) {

      var getDoc = function(id, callback) {
        if (!id) {
          return callback(null, {});
        }
        db.getDoc(id, callback);
      };

      var saveDoc = function(doc, callback) {
        db.saveDoc(doc, function(err, res) {
          if (err) {
            return callback(err);
          }
          if (!doc._id) {
            // new doc added, return the id
            doc._id = res.id;
          }
          doc._rev = res.rev;
          callback(null, doc);
        });
      };

      return function(id, updates, callback) {
        if (!callback) {
          callback = updates;
          updates = id;
          id = null;
        }
        getDoc(id, function(err, doc) {
          if (err) {
            return callback(err);
          }
          doc = _.extend(doc, updates);
          saveDoc(doc, callback);
        });
      };
    }
  ]);

}());