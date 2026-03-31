const db = require('../db');
const authorization = require('./authorization');
const purgedDocs = require('./purged-docs');
const _ = require('lodash');
const replicationLimitLog = require('../services/replication-limit-log');

const getContext = async (userCtx) => {
  const info = await db.medic.info();
  const authContext = await authorization.getAuthorizationContext(userCtx);
  const docsByReplicationKey = await authorization.getDocsByReplicationKey(authContext);

  const allowedIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey);
  const unpurgedIds = await purgedDocs.getUnPurgedIds(userCtx, allowedIds);

  const excludeTasks = { includeTasks: false };
  const warnIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey, excludeTasks);
  const unpurgedWarnIds = _.intersection(unpurgedIds, warnIds);

  await replicationLimitLog.put(userCtx.name, unpurgedIds.length, allowedIds.length);

  return {
    docIds: unpurgedIds,
    warnDocIds: unpurgedWarnIds,
    warn: unpurgedWarnIds.length >= replicationLimitLog.DOC_IDS_WARN_LIMIT,
    limit: replicationLimitLog.DOC_IDS_WARN_LIMIT,
    lastSeq: info.update_seq,
  };
};

const getDocIdsRevPairs = async (docIds) => {
  const result = await db.medic.allDocs({ keys: docIds });
  return result.rows
    .filter(row => row?.value?.rev)
    .map(row => ({ id: row.id, rev: row.value.rev }));
};

const getDocIdsToDelete = async (userCtx, docIds) => {
  if (!docIds.length) {
    return [];
  }

  const allDocs = await db.medic.allDocs({ keys: docIds });
  const toDelete = allDocs.rows
    .filter(row => row.error === 'deleted' || row?.value?.deleted)
    .map(row => row.key);

  const toPurge = await purgedDocs.getPurgedIds(userCtx, docIds, false);
  toDelete.push(...toPurge);

  return toDelete;
};

const pushDocs = async (userCtx, docs) => {
  if (!docs.length) {
    return [];
  }

  const authorizationContext = await authorization.getAuthorizationContext(userCtx);
  const docObjs = docs.map(doc => ({
    doc,
    viewResults: authorization.getViewResults(doc),
    get id() {
      return this.doc._id;
    },
  }));
  const filteredDocObjs = authorization.filterAllowedDocs(authorizationContext, docObjs);
  const filteredDocs = filteredDocObjs.map(docObj => docObj.doc);

  let dbResults = [];
  if (filteredDocs.length) {
    dbResults = await db.medic.bulkDocs(filteredDocs, { new_edits: false });
  }

  // With new_edits: false, CouchDB returns errors only (empty array on full success).
  // Build a lookup of any errors by doc ID.
  const errorById = {};
  for (const result of dbResults) {
    if (result && result.id && result.error) {
      errorById[result.id] = result;
    }
  }

  return docs.map(doc => {
    if (filteredDocs.indexOf(doc) === -1) {
      return { id: doc._id, error: 'forbidden' };
    }
    if (errorById[doc._id]) {
      return errorById[doc._id];
    }
    return { ok: true, id: doc._id, rev: doc._rev };
  });
};

module.exports = {
  getDocIdsRevPairs,
  getContext,
  getDocIdsToDelete,
  pushDocs,
};
