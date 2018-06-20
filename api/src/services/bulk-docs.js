const db = require('../db-pouch'),
      authorization = require('./authorization'),
      _ = require('underscore'),
      serverUtils = require('../server-utils');

const utils = require('bulk-docs-utils')({
  Promise: Promise,
  DB: db.medic
});
const ATTEMPT_LIMIT = 3;

const extractDocs = data => {
  return data.rows
    .map(row => row.doc)
    .filter(doc => doc);
};

const checkForDuplicates = docs => {
  const duplicateErrors = utils.getDuplicateErrors(docs);
  if (duplicateErrors.length > 0) {
    console.error('Deletion errors', duplicateErrors);
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
  return db.medic.allDocs({ keys: ids, include_docs: true })
    .then(extractDocs);
};

const incrementAttemptCounts = (docs, attemptCounts) => {
  docs.forEach(doc => {
    attemptCounts[doc._id] = (attemptCounts[doc._id] || 0) + 1;
  });
};

const getFailuresToRetry = (updateStatuses, docsToDelete, docsToUpdate, deletionAttemptCounts, updateAttemptCounts) => {
  const deletionFailures = [];
  const updateFailures = [];
  const deletionIds = docsToDelete.map(doc => doc._id);
  const updateIds = docsToUpdate.map(doc => doc._id);
  const errorIds = updateStatuses
    .map(docUpdate => docUpdate.error && docUpdate.id)
    .filter(id => id);
  errorIds.forEach(id => {
    // Retry any errors for which the attempt limit has not been reached
    if (deletionIds.includes(id) && deletionAttemptCounts[id] <= ATTEMPT_LIMIT) {
      deletionFailures.push(id);
    } else if (updateIds.includes(id) && updateAttemptCounts[id] <= ATTEMPT_LIMIT) {
      updateFailures.push(id);
    }
  });
  return { deletionFailures, updateFailures };
};

const deleteDocs = (docsToDelete, deletionAttemptCounts = {}, updateAttemptCounts = {}, finalUpdateStatuses = []) => {
  let docsToUpdate;
  let docsToModify;
  let documentByParentId;

  docsToDelete.forEach(doc => doc._deleted = true);
  incrementAttemptCounts(docsToDelete, deletionAttemptCounts);

  return utils.updateParentContacts(docsToDelete)
    .then(updatedParents => {
      documentByParentId = updatedParents.documentByParentId;

      const deletionIds = docsToDelete.map(doc => doc._id);
      // Don't update any parents that are already marked for deletion
      docsToUpdate = updatedParents.docs.filter(doc => !deletionIds.includes(doc._id));
      incrementAttemptCounts(docsToUpdate, updateAttemptCounts);

      const finishedDocs = finalUpdateStatuses.map(docUpdate => docUpdate.id);
      // Don't attempt to update any docs that have already been deleted/updated
      docsToModify = docsToDelete.concat(docsToUpdate).filter(doc => !finishedDocs.includes(doc._id));

      return db.medic.bulkDocs(docsToModify);
    })
    .then(updateStatuses => {
      updateStatuses.forEach((docUpdate, index) => docUpdate.id = docsToModify[index]._id);
      updateStatuses = updateStatuses.filter(docUpdate => docUpdate.status !== 404);
      const { deletionFailures, updateFailures } = getFailuresToRetry(updateStatuses, docsToDelete, docsToUpdate, deletionAttemptCounts, updateAttemptCounts);
      // Don't send errors for docs that will be retried
      updateStatuses = updateStatuses.filter(docUpdate => !deletionFailures.includes(docUpdate.id) && !updateFailures.includes(docUpdate.id));
      finalUpdateStatuses = finalUpdateStatuses.concat(updateStatuses);

      if (deletionFailures.length > 0 || updateFailures.length > 0) {
        return fetchDocs(deletionFailures)
          .then(docsToDelete => {
            // Retry updates by resending through the child doc (ensuring the update is still necessary in case of conflict)
            const updatesToRetryThroughDocDeletions = updateFailures
              .map(id => documentByParentId[id])
              .filter(doc => !deletionFailures.includes(doc._id));
            return deleteDocs(docsToDelete.concat(updatesToRetryThroughDocDeletions), deletionAttemptCounts, updateAttemptCounts, finalUpdateStatuses);
          });
      }
      return finalUpdateStatuses;
    });
};

const filterNewDocs = (allowedDocIds, docs) => {
  let docIds = _.unique(_.compact(docs.map(doc => doc._id)));

  if (!docIds.length) {
    // all docs are new
    return Promise.resolve(docs);
  }

  docIds = _.difference(docIds, allowedDocIds);

  if (!docIds.length) {
    // all docs are allowed
    return Promise.resolve([]);
  }

  // return docs without ids or docs which do not exist
  return db.medic
    .allDocs({ keys: docIds })
    .then(result => {
      return docs.filter(doc =>
        !doc._id ||
        (allowedDocIds.indexOf(doc._id) === -1 && !result.rows.find(row => row.id === doc._id))
      );
    });
};

// iterates over request `docs`, filtering the ones the user is allowed to see or create
// when a doc adds new allowed `subjectIds`, the remaining `docs` are reiterated
const filterAllowedDocs = (authorizationContext, docs) => {
  const allowedDocs = [];
  let shouldCheck = true,
      pendingDocs = docs.map(doc => ({
        doc,
        viewResults: authorization.getViewResults(doc),
        alwaysAllowCreate: authorization.alwaysAllowCreate(doc)
      }));

  const checkDoc = (docObj) => {
    const allowed = docObj.alwaysAllowCreate ||
                    authorization.allowedDoc(docObj.doc._id, authorizationContext, docObj.viewResults);

    if (!allowed) {
      return;
    }

    shouldCheck = allowed.newSubjects;
    allowedDocs.push(docObj.doc);
    pendingDocs = _.without(pendingDocs, docObj);
  };

  while (pendingDocs.length && shouldCheck) {
    shouldCheck = false;
    pendingDocs.forEach(checkDoc);
  }

  return allowedDocs;
};

// Filters the list of request docs to the ones that satisfy the following conditions:
// a. the user will be allowed to see the doc after being updated/created
// b. the user is allowed to see the stored doc
const filterRequestDocs = (authorizationContext, docs) => {
  if (!docs.length) {
    return Promise.resolve([]);
  }

  // prevent restricted users from creating or updating docs they will not be allowed to see
  const allowedRequestDocs = filterAllowedDocs(authorizationContext, docs);

  return filterNewDocs(authorizationContext.allowedDocIds, allowedRequestDocs).then(allowedNewDocs => {
    const allowedDocs = allowedRequestDocs.filter(doc => authorizationContext.allowedDocIds.indexOf(doc._id) !== -1);
    allowedDocs.push.apply(allowedDocs, allowedNewDocs);

    return allowedDocs;
  });
};

const stubSkipped = (docs, filteredDocs, result) => {
  return docs.map(doc => {
      const filteredIdx = _.findIndex(filteredDocs, doc);
      if (filteredIdx !== -1) {
        return result[filteredIdx];
      }

      return { id: doc._id, error: 'forbidden' };
    }
  );
};

const interceptResponse = (req, res, response) => {
  response = JSON.parse(response);

  if (req.body.new_edits !== false && _.isArray(response)) {
    // CouchDB doesn't return results when `new_edits` parameter is `false`
    // The consensus is that the response array sequence should reflect the request array sequence.
    response = stubSkipped(req.originalBody.docs, req.body.docs, response);
  }
  res.write(JSON.stringify(response));
  res.end();
};

const requestError = reason => ({
  error: 'bad_request',
  reason: reason
});

const invalidRequest = req => {
  if (!req.body) {
    return requestError('invalid UTF-8 JSON');
  }

  if (!req.body.docs) {
    return requestError('POST body must include `docs` parameter.');
  }

  if (!_.isArray(req.body.docs)) {
    return requestError('`docs` parameter must be an array.');
  }

  return false;
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
    return batches.reduce((promise, batch, index) => {
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
  // offline users will only update/create/delete documents they are allowed to see and will be allowed to see
  // mimics CouchDB response format, stubbing forbidden docs and respecting document sequence
  filterOfflineRequest: (req, res, next) => {
    res.type('json');

    const error = invalidRequest(req);
    if (error) {
      res.write(JSON.stringify(error));
      return res.end();
    }

    const authorizationContext = { userCtx: req.userCtx };

    return authorization
      .getUserAuthorizationData(req.userCtx)
      .then(authorizationData => {
        _.extend(authorizationContext, authorizationData);
        return authorization.getAllowedDocIds(authorizationContext);
      })
      .then(allowedDocIds => {
        authorizationContext.allowedDocIds = authorization.convertTombstoneIds(allowedDocIds);
        return filterRequestDocs(authorizationContext, req.body.docs);
      })
      .then(filteredDocs => {
        // results received from CouchDB need to be ordered to maintain same sequence as original `docs` parameter
        // and forbidden docs stubs must be added
        res.interceptResponse = _.partial(interceptResponse, req, res);
        req.originalBody = { docs: req.body.docs };
        req.body.docs = filteredDocs;
        next();
      })
      .catch(err => serverUtils.serverError(err, req, res));
  }
};

// used for testing
if (process.env.UNIT_TEST_ENV) {
  _.extend(module.exports, {
    _filterRequestDocs: filterRequestDocs,
    _filterNewDocs: filterNewDocs,
    _filterAllowedDocs: filterAllowedDocs,
    _interceptResponse: interceptResponse,
    _invalidRequest: invalidRequest
  });
}
