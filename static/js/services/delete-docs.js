var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteDocs',
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

      var checkForDuplicates = function(docs) {
        var errors = [];
        var dedup = [];
        docs.forEach(function(doc) {
          if (dedup.indexOf(doc._id) !== -1) {
            errors.push({
              error: 'conflict',
              message : 'Duplicate documents to delete, with id ' + doc._id + '. Not deleting to avoid conflict.',
              id: doc._id
            });
          }
          dedup.push(doc._id);
        });
        if (errors.length) {
          var error = new Error('Deletion error');
          error.errors = errors;
          throw error;
        }
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
        docs.forEach(function(doc) {
          doc._deleted = true;
        });
        return $q.all(docs.map(function(doc) {
          return getParent(doc)
            .then(function(parent) {
              if (parent) {
                docs.push(parent);
              }
            });
          }))
          .then(function() {
            return checkForDuplicates(docs);
          })
          .then(function() {
            return DB.get().bulkDocs(docs);
          })
          // No silent fails! Throw on error.
          .then(function(results) {
            var errors = _.filter(results, function(result) {
              if (result.error) {
                return result;
              }
            });
            if (errors.length) {
              var error = new Error('Deletion error');
              error.errors = errors;
              throw error;
            }
          });
      };

    }
  );

}());
