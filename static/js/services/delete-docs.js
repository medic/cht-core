var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteDocs',
    function(
      $log,
      $q,
      DB,
      ExtractLineage
    ) {

      'ngInject';

      var getParent = function(doc) {
        if (doc.type === 'person' && doc.parent && doc.parent._id) {
          return DB()
            .get(doc.parent._id)
            .then(function(parent) {
              if (parent.contact &&
                  parent.contact._id &&
                  parent.contact._id === doc._id) {
                // this doc is the contact for the parent - update parent
                parent.contact = null;
                return parent;
              }
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
          $log.error('Deletion errors', errors);
          throw new Error('Deletion error');
        }
      };

      var minifyLineage = function (docs) {
        docs.forEach(function (doc) {
          if (doc.type === 'data_record' && doc.contact) {
            doc.contact = ExtractLineage(doc.contact);
          }
        });
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
        } else {
          docs = _.clone(docs);
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
            return minifyLineage(docs);
          })
          .then(function() {
            return DB().bulkDocs(docs);
          })
          // No silent fails! Throw on error.
          .then(function(results) {
            var errors = _.filter(results, function(result) {
              if (result.error) {
                return result;
              }
            });
            if (errors.length) {
              $log.error('Deletion errors', errors);
              throw new Error('Deletion error');
            }
          });
      };

    }
  );

}());
