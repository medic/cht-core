var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteDoc',
    function(
      $q,
      DB
    ) {

      'ngInject';

      var getParent = function(doc) {
        if (doc.type === 'person' && doc.parent && doc.parent._id) {
          return DB.get()
            .get(doc.parent._id)
            .then(function(parent) {
              if (parent.contact.phone !== doc.phone) {
                return;
              }
              parent.contact = null;
              return parent;
            });
        }
        return $q.resolve();
      };

      /**
       * Delete the given docs. If 'person' type then also fix the
       * contact hierarchy.
       *
       * @param docs {Object|Array} Document or array of documents to delete.
       */
      return function(docs) {
        if (!_.isArray(docs)) {
          docs = [ docs ];
        }
        try {
          var dedup = {};
          _.each(docs, function(doc) {
            if (dedup[doc._id]) {
              throw {
                name: 'Deletion error',
                message: 'Deletion error',
                errors: [{
                  error: 'conflict',
                  message : 'Duplicate documents to delete, with id ' + doc._id + '. Not deleting to avoid conflict.',
                  id: doc._id
                }]
              };
            }
            dedup[doc._id] = doc._id;
          });
        } catch(err) {
          return $q.reject(err);
        }
        var toUpdate = docs.map(function(doc) {
          return {
            _id: doc._id,
            _rev: doc._rev,
            _deleted: true
          };
        });
        return $q.all(docs.map(function(doc) {
          return getParent(doc)
            .then(function(parent) {
              if (parent) {
                toUpdate.push(parent);
              }
            });
          }))
          .then(function() {
            return DB.get().bulkDocs(toUpdate);
          })
          // No silent fails! Throw on error.
          .then(function(results) {
            var errors = _.filter(results, function(result) {
              if (result.error) {
                return result;
              }
            });
            if (errors.length) {
              throw {
                name: 'Deletion error',
                message: 'Deletion error',
                errors: errors
              };
            }
          });
      };

    }
  );

}());
