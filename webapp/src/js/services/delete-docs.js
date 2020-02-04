const _ = require('lodash');
const partialParse = require('partial-json-parser');
const utilsFactory = require('@medic/bulk-docs-utils');

(function () {

  'use strict';

  angular.module('inboxServices').factory('DeleteDocs',
    function(
      $log,
      $q,
      Changes,
      DB,
      ExtractLineage,
      Session
    ) {
      'ngInject';
      const utils = utilsFactory({
        Promise: $q,
        DB: DB()
      });

      const checkForDuplicates = function (docs) {
        const errors = utils.getDuplicateErrors(docs);
        if (errors.length > 0) {
          $log.error('Deletion errors', errors);
          throw new Error('Deletion error');
        }
      };

      const minifyLineage = function (docs) {
        docs.forEach(function (doc) {
          if (doc.type === 'data_record' && doc.contact) {
            doc.contact = ExtractLineage(doc.contact);
          }
        });
      };

      const deleteAndUpdateDocs = function (docsToDelete, eventListeners) {
        if (Session.isOnlineOnly()) {
          const docIds = docsToDelete.map(function(doc) {
            return { _id: doc._id };
          });

          return bulkDeleteRemoteDocs(docIds, eventListeners);
        } else {
          docsToDelete.forEach(function(doc) {
            doc._deleted = true;
          });
          checkForDuplicates(docsToDelete);
          return utils.updateParentContacts(docsToDelete)
            .then(function(updatedParents) {
              const allDocs = docsToDelete.concat(updatedParents.docs);
              minifyLineage(allDocs);
              return DB().bulkDocs(allDocs);
            });
        }
      };

      const bulkDeleteRemoteDocs = function (docs, eventListeners) {
        // TODO: we're temporarily (?) killing the changes feed here for performance
        // Having the changes feed watching and then disseminating changes to the whole
        // page causes massive performance issues while large deletes are occurring.
        // We need to fix this either by improving performance in this area or by
        // radically change how we follow changes for online users
        // https://github.com/medic/medic/issues/4327
        Changes.killWatchers();

        const deferred = $q.defer();
        const xhr = new XMLHttpRequest();
        xhr.onprogress = function() {
          if (xhr.responseText) {
            const currentResponse = partialParse(xhr.responseText);
            const successfulDeletions = _.flattenDeep(currentResponse).filter(function(doc) {
              return !doc.error;
            });
            const totalDocsDeleted = successfulDeletions.length;
            if (eventListeners.progress && Array.isArray(currentResponse)) {
              eventListeners.progress(totalDocsDeleted);
            }
          }
        };
        xhr.onload = function() {
          if (this.status >= 200 && this.status < 300) {
            try {
              deferred.resolve(_.flattenDeep(JSON.parse(xhr.response)));
            } catch (err) {
              deferred.reject(err);
            }
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
            const errors = results.filter(function(result) {
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
