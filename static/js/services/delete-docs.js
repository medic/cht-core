var _ = require('underscore');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteDocs',
    function(
      $http,
      $log,
      $q,
      DB,
      ExtractLineage,
      Session
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

      var bulkDeleteRemoteDocs = function (docs, eventListeners) {
        var concatResponses = function(batchResponses) {
          return batchResponses.reduce(function(concattedResponses, batchResponse) {
            return concattedResponses.concat(batchResponse);
          }, []);
        };

        return $q(function(resolve, reject) {
          var xhr = new XMLHttpRequest();
          xhr.onprogress = function() {
            if (xhr.responseText) {
              var currentResponse = xhr.responseText.replace(/,\s*$/, ']').replace(/}\s*]\s*$/, '}]]');
              var totalDocsDeleted = concatResponses(JSON.parse(currentResponse)).length;
              if (eventListeners.progress) {
                eventListeners.progress(totalDocsDeleted);
              }
            }
          };
          xhr.onload = function() {
            if (this.status >= 200 && this.status < 300) {
              resolve(concatResponses(JSON.parse(xhr.response)));
            } else {
              reject(new Error('Server responded with ' + this.status + ': ' + xhr.statusText));
            }
          };
          xhr.onerror = function() {
            reject(new Error('Server responded with ' + this.status + ': ' + xhr.statusText));
          };
          xhr.open('POST', '/api/v1/bulk-delete', true);
          xhr.setRequestHeader('Content-type', 'application/json');
          xhr.send(JSON.stringify({ docs: docs }));
        });
      };

      /**
       * Delete the given docs. If 'person' type then also fix the
       * contact hierarchy.
       *
       * @param docs {Object|Array} Document or array of documents to delete.
       * @param eventListeners {Object} Map of event listeners to callback functions.
       *    Available events are: 'progress'.
       */
      return function(docs, eventListeners) {
        eventListeners = eventListeners || {};
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
            if (Session.isAdmin()) {
              return bulkDeleteRemoteDocs(docs, eventListeners);
            }
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
