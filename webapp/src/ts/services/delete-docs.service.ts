import { Injectable } from '@angular/core';
import { flattenDeep as _flattenDeep } from 'lodash-es';
import * as partialParse from 'partial-json-parser';
import * as utilsFactory from '@medic/bulk-docs-utils';

import { ChangesService } from '@mm-services/changes.service';
import { DbService } from '@mm-services/db.service';
import { ExtractLineageService } from '@mm-services/extract-lineage.service';
import { SessionService } from '@mm-services/session.service';

@Injectable({
  providedIn: 'root'
})
export class DeleteDocsService {
  private utils;

  constructor(
    private changesService:ChangesService,
    private dbService:DbService,
    private extractLineageService:ExtractLineageService,
    private sessionService:SessionService,
  ) {
    this.utils = utilsFactory({ Promise, DB: this.dbService.get() });
  }

  checkForDuplicates(docs) {
    const errors = this.utils.getDuplicateErrors(docs);
    if (errors.length > 0) {
      console.error('Deletion errors', errors);
      throw new Error('Deletion error');
    }
  }

  minifyLineage(docs) {
    docs.forEach((doc) => {
      if (doc.type === 'data_record' && doc.contact) {
        doc.contact = this.extractLineageService.extract(doc.contact);
      }
    });
  }

  deleteAndUpdateDocs(docsToDelete, eventListeners) {
    if (this.sessionService.isOnlineOnly()) {
      const docIds = docsToDelete.map((doc) => {
        return { _id: doc._id };
      });

      return this.bulkDeleteRemoteDocs(docIds, eventListeners);
    }
    docsToDelete.forEach((doc) => {
      doc._deleted = true;
    });
    this.checkForDuplicates(docsToDelete);
    return this.utils
      .updateParentContacts(docsToDelete)
      .then((updatedParents) => {
        const allDocs = docsToDelete.concat(updatedParents.docs);
        this.minifyLineage(allDocs);
        return this.dbService.get().bulkDocs(allDocs);
      });
  }

  bulkDeleteRemoteDocs(docs, eventListeners) {
    // TODO: we're temporarily (?) killing the changes feed here for performance
    // Having the changes feed watching and then disseminating changes to the whole
    // page causes massive performance issues while large deletes are occurring.
    // We need to fix this either by improving performance in this area or by
    // radically change how we follow changes for online users
    // https://github.com/medic/medic/issues/4327
    this.changesService.killWatchers();

    const deferred:any = {};
    deferred.promise = new Promise((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    const xhr = new XMLHttpRequest();
    xhr.onprogress = () => {
      if (xhr.responseText) {
        const currentResponse = partialParse(xhr.responseText);
        const successfulDeletions = _flattenDeep(currentResponse).filter((doc:any) => {
          return !doc.error;
        });
        const totalDocsDeleted = successfulDeletions.length;
        if (eventListeners.progress && Array.isArray(currentResponse)) {
          eventListeners.progress(totalDocsDeleted);
        }
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          deferred.resolve(_flattenDeep(JSON.parse(xhr.response)));
        } catch (err) {
          deferred.reject(err);
        }
      } else {
        deferred.reject(new Error('Server responded with ' + xhr.status + ': ' + xhr.statusText));
      }
    };
    xhr.onerror = () => {
      deferred.reject(new Error('Server responded with ' + xhr.status + ': ' + xhr.statusText));
    };
    xhr.open('POST', '/api/v1/bulk-delete', true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.send(JSON.stringify({ docs: docs }));
    return deferred.promise;
  }

  /*
  * Delete the given docs. If 'person' type then also fix the
  * contact hierarchy by updating the case when doc.parent.contact == doc
  * for one of the docs to be deleted (simply removes doc.parent.contact
  * in this case).
  *
  * @param docs {Object|Array} Document or array of documents to delete.
  * @param eventListeners {Object} Map of event listeners to callback functions.
  *    Available events are: 'progress'.
  */
  delete(docs, eventListeners = {}) {
    if (!Array.isArray(docs)) {
      docs = [ docs ];
    }

    docs = docs.map(doc => ({ ...doc }));
    return this
      .deleteAndUpdateDocs(docs, eventListeners)
      // No silent fails! Throw on error.
      .then((results:any) => {
        const errors = results.filter((result:any) => result.error);
        if (errors.length) {
          console.error('Deletion errors', errors);
          throw new Error('Deletion error');
        }
      });
  }
}
