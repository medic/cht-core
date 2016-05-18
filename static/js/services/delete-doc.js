var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteDoc', ['$q', 'DB',
    function($q, DB) {

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
            return DB.get().bulkDocs(docs);
          });
      };

    }
  ]);

}());
