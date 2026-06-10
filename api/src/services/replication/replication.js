const db = require('../../db');
const authorization = require('./authorization');
const purgedDocs = require('./purged-docs');
const _ = require('lodash');
const replicationLimitLog = require('./replication-limit-log');
const replicationFailureLog = require('./replication-failure-log');
const { limits, ReplicationLimitError, ReplicationThrottledError } = require('./replication-limit');

const getContext = async (userCtx) => {
  // Short-circuit users who recently hit a hard limit, before doing any expensive work, so repeated
  // attempts during the cooldown don't re-pay the authorization cost.
  if (await replicationFailureLog.hasRecentLimitFailure(userCtx.name)) {
    throw new ReplicationThrottledError(
      `Replication for user "${userCtx.name}" is throttled following a recent limit failure`
    );
  }

  const info = await db.medic.info();
  const authContext = await authorization.getAuthorizationContext(userCtx);
  userCtx.subjectsCount = authContext.subjectIds.length;
  const docsByReplicationKey = await authorization.getDocsByReplicationKey(authContext);

  const allowedIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey);
  userCtx.docsCount = allowedIds.length;
  const unpurgedIds = await purgedDocs.getUnPurgedIds(userCtx, allowedIds);
  userCtx.unpurgedDocsCount = unpurgedIds.length;

  const excludeTasks = { includeTasks: false };
  const warnIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey, excludeTasks);
  const unpurgedWarnIds = _.intersection(unpurgedIds, warnIds);

  // The hard document limit is the real policy gate. It counts the same task-excluded set as the
  // warning, so task churn alone can never push a user over the wall.
  if (unpurgedWarnIds.length > limits.DOC_LIMIT) {
    userCtx.replicationLimitExceeded = true;
    userCtx.replicationLimitType = 'documents';
    throw new ReplicationLimitError(
      `User "${userCtx.name}" exceeds the document replication limit of ${limits.DOC_LIMIT}`,
      'documents'
    );
  }

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

module.exports = {
  getDocIdsRevPairs,
  getContext,
  getDocIdsToDelete,
};
