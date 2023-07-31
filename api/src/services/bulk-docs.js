const db = require('../db');
const authorization = require('./authorization');
const _ = require('lodash');
const logger = require('../logger');

const utils = require('@medic/bulk-docs-utils')({
  Promise: Promise,
  DB: db.medic,
});
const ATTEMPT_LIMIT = 3;

const extractDocs = data => {
  return data.rows.map(row => row.doc).filter(doc => doc);
};

const checkForDuplicates = docs => {
  const duplicateErrors = utils.getDuplicateErrors(docs);
  if (duplicateErrors.length > 0) {
    logger.error('Deletion errors: %o', duplicateErrors);
    const ids = duplicateErrors.map(error => error.id);
    throw new Error(`Duplicate documents when deleting: ${ids.join(',')}`);
  }
};

const generateBatches = (ids, batchSize) => {
  const batches = [];
  while (ids.length > 0) {
    const batch = ids.splice(0, batchSize);
    batches.push(batch);
  }
  return batches;
};

const fetchDocs = ids => {
  if (ids.length === 0) {
    return Promise.resolve([]);
  }
  return db.medic.allDocs({ keys: ids, include_docs: true }).then(extractDocs);
};

const incrementAttemptCounts = (docs, attemptCounts) => {
  docs.forEach(doc => {
    attemptCounts[doc._id] = (attemptCounts[doc._id] || 0) + 1;
  });
};

const getFailuresToRetry = (
  updateStatuses,
  docsToDelete,
  docsToUpdate,
  deletionAttemptCounts,
  updateAttemptCounts
) => {
  const deletionFailures = [];
  const updateFailures = [];
  const deletionIds = docsToDelete.map(doc => doc._id);
  const updateIds = docsToUpdate.map(doc => doc._id);
  const errorIds = updateStatuses
    .map(docUpdate => docUpdate.error && docUpdate.id)
    .filter(id => id);
  errorIds.forEach(id => {
    // Retry any errors for which the attempt limit has not been reached
    if (
      deletionIds.includes(id) &&
      deletionAttemptCounts[id] <= ATTEMPT_LIMIT
    ) {
      deletionFailures.push(id);
    } else if (
      updateIds.includes(id) &&
      updateAttemptCounts[id] <= ATTEMPT_LIMIT
    ) {
      updateFailures.push(id);
    }
  });
  return { deletionFailures, updateFailures };
};

const deleteDocs = (
  docsToDelete,
  deletionAttemptCounts = {},
  updateAttemptCounts = {},
  finalUpdateStatuses = []
) => {
  let docsToUpdate;
  let docsToModify;
  let documentByParentId;

  docsToDelete.forEach(doc => (doc._deleted = true));
  incrementAttemptCounts(docsToDelete, deletionAttemptCounts);

  return utils
    .updateParentContacts(docsToDelete)
    .then(updatedParents => {
      documentByParentId = updatedParents.documentByParentId;

      const deletionIds = docsToDelete.map(doc => doc._id);
      // Don't update any parents that are already marked for deletion
      docsToUpdate = updatedParents.docs.filter(
        doc => !deletionIds.includes(doc._id)
      );
      incrementAttemptCounts(docsToUpdate, updateAttemptCounts);

      const finishedDocs = finalUpdateStatuses.map(docUpdate => docUpdate.id);
      // Don't attempt to update any docs that have already been deleted/updated
      docsToModify = docsToDelete
        .concat(docsToUpdate)
        .filter(doc => !finishedDocs.includes(doc._id));

      return db.medic.bulkDocs(docsToModify);
    })
    .then(updateStatuses => {
      updateStatuses.forEach(
        (docUpdate, index) => (docUpdate.id = docsToModify[index]._id)
      );
      updateStatuses = updateStatuses.filter(
        docUpdate => docUpdate.status !== 404
      );
      const { deletionFailures, updateFailures } = getFailuresToRetry(
        updateStatuses,
        docsToDelete,
        docsToUpdate,
        deletionAttemptCounts,
        updateAttemptCounts
      );
      // Don't send errors for docs that will be retried
      updateStatuses = updateStatuses.filter(
        docUpdate =>
          !deletionFailures.includes(docUpdate.id) &&
          !updateFailures.includes(docUpdate.id)
      );
      finalUpdateStatuses = finalUpdateStatuses.concat(updateStatuses);

      if (deletionFailures.length > 0 || updateFailures.length > 0) {
        return fetchDocs(deletionFailures).then(docsToDelete => {
          // Retry updates by resending through the child doc
          // (ensuring the update is still necessary in case of conflict)
          const updatesToRetryThroughDocDeletions = updateFailures
            .map(id => documentByParentId[id])
            .filter(doc => !deletionFailures.includes(doc._id));
          return deleteDocs(
            docsToDelete.concat(updatesToRetryThroughDocDeletions),
            deletionAttemptCounts,
            updateAttemptCounts,
            finalUpdateStatuses
          );
        });
      }
      return finalUpdateStatuses;
    });
};

const filterNewDocs = (allowedDocIds, docs) => {
  let docIds = _.uniq(_.compact(docs.map(doc => doc._id)));

  if (!docIds.length) {
    // all docs are new
    return Promise.resolve(docs);
  }

  docIds = _.difference(docIds, allowedDocIds);

  if (!docIds.length) {
    // all docs are allowed
    return Promise.resolve([]);
  }

  return db.medic.allDocs({ keys: docIds }).then(result => {
    return docs.filter(doc => {
      // return docs without ids or docs which do not exist
      return (
        !doc._id ||
        (allowedDocIds.indexOf(doc._id) === -1 &&
          !result.rows.find(row => row.id === doc._id))
      );
    });
  });
};

// returns a list of filtered docs the user is allowed to update/create
const filterAllowedDocs = (authorizationContext, docs) => {
  docs = docs.map(doc => ({
    doc,
    viewResults: authorization.getViewResults(doc),
    allowed: authorization.alwaysAllowCreate(doc),
    get id() {
      return this.doc._id;
    },
  }));
  return authorization
    .filterAllowedDocs(authorizationContext, docs)
    .map(docObj => docObj.doc);
};

const getExistentDocs = docs => {
  const docIds = docs.map(doc => doc._id).filter(id => id);

  return db.medic
    .allDocs({ keys: docIds, include_docs: true })
    .then(result =>
      Object.assign({}, ...result.rows.filter(row => row.doc).map(row => ({ [row.id]: row.doc }))));
};

// Filters the list of request docs to the ones that satisfy the following conditions:
// - the user will be allowed to see the doc if this request is successful
// - the user is allowed to see the stored doc, if it exists
const filterRequestDocs = (authorizationContext, docs) => {
  if (!docs.length) {
    return Promise.resolve([]);
  }

  // prevent offline users from creating or updating docs they will not be allowed to see
  const allowedRequestDocs = filterAllowedDocs(authorizationContext, docs);

  return getExistentDocs(allowedRequestDocs).then(existentDocs => {
    const allowedDocs = allowedRequestDocs.filter(doc => {
      const existentDoc = doc._id && existentDocs[doc._id];
      return !existentDoc ||
             authorization.allowedDoc(doc._id, authorizationContext, authorization.getViewResults(existentDoc));
    });

    return allowedDocs;
  });
};

const stubSkipped = (docs, filteredDocs, result) => {
  return docs
    .map(doc => {
      const filteredIdx = _.findIndex(filteredDocs, doc);
      if (filteredIdx !== -1) {
        return result[filteredIdx];
      }
      return { id: doc._id, error: 'forbidden' };
    })
    .filter(resp => resp);
};

module.exports = {
  bulkDelete: (docs, res, { batchSize = 100 } = {}) => {
    checkForDuplicates(docs);
    const ids = docs.map(doc => doc._id);
    const batches = generateBatches(ids, batchSize);
    res.type('application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write('[');
    res.flush();
    return batches
      .reduce((promise, batch, index) => {
        return promise
          .then(() => fetchDocs(batch))
          .then(deleteDocs)
          .then(result => {
            let resString = JSON.stringify(result);
            if (index !== batches.length - 1) {
              resString += ',';
            }
            res.write(resString);
            res.flush();
          });
      }, Promise.resolve())
      .then(() => {
        res.write(']');
        res.flush();
        res.end();
      });
  },

  // offline users will only create/update/delete documents they are allowed to see and will be allowed to see
  // mimics CouchDB response format, stubbing forbidden docs and respecting requested `docs` sequence
  filterOfflineRequest: (userCtx, docs) => {
    return authorization
      .getAuthorizationContext(userCtx)
      .then(authorizationContext => filterRequestDocs(authorizationContext, docs));
  },

  // results received from CouchDB need to be ordered to maintain same sequence as original `docs` parameter
  // and forbidden docs stubs must be added
  formatResults: (requestDocs, filteredDocs, response) => {
    if (_.isArray(response)) {
      response = stubSkipped(requestDocs, filteredDocs, response);
    }

    return response;
  },
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  Object.assign(module.exports, {
    _filterRequestDocs: filterRequestDocs,
    _filterNewDocs: filterNewDocs,
    _filterAllowedDocs: filterAllowedDocs,
  });
}
