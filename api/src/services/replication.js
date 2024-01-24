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

  await replicationLimitLog.put(userCtx.name, unpurgedIds.length);

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

module.exports = {
  getDocIdsRevPairs,
  getContext,
  getDocIdsToDelete,
};
