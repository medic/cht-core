const db = require('../../db');
const authorization = require('./authorization');
const { REPLICATION_LIMITS } = require('./authorization');
const purgedDocs = require('./purged-docs');
const _ = require('lodash');
const replicationLimitLog = require('./replication-limit-log');
const dataContext = require('../data-context');
const config = require('../../config');
const { users, updateUser } = require('@medic/user-management')(config, db, dataContext);
const { ReplicationLimitError } = require('../../errors');

const assertUserAllowedToReplicate = async ({ name }) => {
  const { replication_blocked } = await users.getUserDoc(name);
  if (replication_blocked === true) {
    throw new Error(`User "${name}" has been banned from replicating.`);
  }
};

const getContext = async (userCtx) => {
  await assertUserAllowedToReplicate(userCtx);
  const info = await db.medic.info();
  const authContext = await authorization.getAuthorizationContext(userCtx);
  userCtx.subjectsCount = authContext.subjectIds.length;
  try {
    if (userCtx.subjectsCount > REPLICATION_LIMITS.SUBJECTS_COUNT) {
      throw new ReplicationLimitError(
        `User "${userCtx.name}" exceeds the subject limit with [${userCtx.subjectsCount}] subjects.`
      );
    }
    const docsByReplicationKey = await authorization.getDocsByReplicationKey(authContext);

    const allowedIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey);
    userCtx.docsCount = allowedIds.length;
    const unpurgedIds = await purgedDocs.getUnPurgedIds(userCtx, allowedIds);
    userCtx.unpurgedDocsCount = unpurgedIds.length;
    if (userCtx.unpurgedDocsCount > REPLICATION_LIMITS.UNPURGED_DOCS_COUNT) {
      throw new ReplicationLimitError(
        `User "${userCtx.name}" exceeds the document replication limit with [${userCtx.unpurgedDocsCount}] documents.`
      );
    }

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
  } catch (e) {
    if (e instanceof ReplicationLimitError) {
      await updateUser(userCtx.name, { replication_blocked: true }, true);
    }
    throw e;
  }
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
