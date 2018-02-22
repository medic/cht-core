var _ = require('underscore');
var partialParse = require('partial-json-parser');
var utilsFactory = require('bulk-docs-utils');

(function () {

  'use strict';

  var inboxServices = angular.module('inboxServices');

  inboxServices.factory('DeleteDocs',
    function(
      $log,
      $q,
      DB,
      ExtractLineage,
      Session
    ) {
      'ngInject';
      var utils = utilsFactory({
        Promise: $q,
        DB: DB,
        log: $log
      });

      var minifyLineage = function (docs) {
        docs.forEach(function (doc) {
          if (doc.type === 'data_record' && doc.contact) {
            doc.contact = ExtractLineage(doc.contact);
          }
        });
      };

      var deleteAndUpdateDocs = function (docsToDelete, eventListeners) {
        var onlineUser = Session.isAdmin();
        if (onlineUser) {
          var docIds = docsToDelete.map(function(doc) {
            return { _id: doc._id };
          });

          return bulkDeleteRemoteDocs(docIds, eventListeners);
        } else {
          docsToDelete.forEach(function(doc) {
            doc._deleted = true;
          });
          return utils.updateParentContacts(docsToDelete)
            .then(function(updatedParents) {
              var allDocs = docsToDelete.concat(updatedParents);
              utils.checkForDuplicates(allDocs);
              minifyLineage(allDocs);
              return DB().bulkDocs(allDocs);
            });
        }
      };

      var bulkDeleteRemoteDocs = function (docs, eventListeners) {
        var deferred = $q.defer();
        var xhr = new XMLHttpRequest();
        xhr.onprogress = function() {
          if (xhr.responseText) {
            var currentResponse = partialParse(xhr.responseText);
            var totalDocsDeleted = _.flatten(currentResponse).length;
            if (eventListeners.progress && Array.isArray(currentResponse)) {
              eventListeners.progress(totalDocsDeleted);
            }
          }
        };
        xhr.onload = function() {
          if (this.status >= 200 && this.status < 300) {
            deferred.resolve(_.flatten(JSON.parse(xhr.response)));
          } else {
            deferred.reject(new Error('Server responded with ' + this.status + ': ' + xhr.statusText));
          }
        };
        xhr.onerror = function() {
          deferred.reject(new Error('Server responded with ' + this.status + ': ' + xhr.statusText));
        };
        xhr.open('POST', '/api/v1/bulk-delete', true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify({ docs: docs }));
        return deferred.promise;
      };

      /**
       * Delete the given docs. If 'person' type then also fix the
       * contact hierarchy by updating the case when doc.parent.contact == doc
       * for one of the docs to be deleted (simply removes doc.parent.contact
       * in this case).
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

        return deleteAndUpdateDocs(docs, eventListeners)
          // No silent fails! Throw on error.
          .then(function(results) {
            var errors = results.filter(function(result) {
              return result.error;
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
