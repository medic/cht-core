(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteDoc', ['DB',
    function(DB) {

      var updateParent = function(doc, callback) {
        if (doc.type === 'person' && doc.parent && doc.parent._id) {
          DB.get()
            .get(doc.parent._id)
            .then(function(parent) {
              if (parent.contact.phone !== doc.phone) {
                return callback();
              }
              parent.contact = null;
              DB.get()
                .put(parent)
                .then(function() {
                  callback();
                })
                .catch(function(err) {
                  callback(err);
                });
            })
            .catch(function(err) {
              if (err.reason === 'deleted') {
                return callback();
              }
              return callback(err);
            });
        } else {
          callback();
        }
      };

      return function(docId, callback) {
        DB.get()
          .get(docId)
          .then(function(doc) {
            updateParent(doc, function(err) {
              if (err) {
                return callback(err);
              }
              doc._deleted = true;
              DB.get()
                .put(doc)
                .then(function() {
                  callback(null, doc);
                })
                .catch(function(err) {
                  return callback(err);
              });
            });
          })
          .catch(function(err) {
            return callback(err);
          });
      };

    }
  ]);

}());
