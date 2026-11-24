const db = require('../../db');
const authorization = require('./authorization');
const purgedDocs = require('./purged-docs');
const _ = require('lodash');
const replicationLimitLog = require('./replication-limit-log');
const config = require('../../config');
const logger = require('@medic/logger');
const { ReplicationLimitError } = require('../../errors');

const DEFAULT_LIMITS = {
  contacts: 50 * 1000,
  docs: 500 * 1000,
  unpurged_docs: 100 * 1000,
};

const getLimit = (key) => {
  const configured = config.get('replication_limits')?.[key];
  if (configured === undefined) {
    return DEFAULT_LIMITS[key];
  }
  if (configured === false) {
    return Infinity;
  }
  if (!Number.isInteger(configured) || configured < 0) {
    logger.warn(`Invalid replication_limits.${key} value "${configured}", using default ${DEFAULT_LIMITS[key]}`);
    return DEFAULT_LIMITS[key];
  }
  return configured;
};

const assertWithinLimit = (userCtx, key, count) => {
  const limit = getLimit(key);
  if (count > limit) {
    throw new ReplicationLimitError(
      `User "${userCtx.name}" exceeds the replication ${key} limit: ${count} > ${limit}`
    );
  }
};

const getContext = async (userCtx, res) => {
  const info = await db.medic.info();
  const authContext = await authorization.getAuthorizationContext(userCtx);
  userCtx.subjectsCount = authContext.subjectIds.length;
  assertWithinLimit(userCtx, 'contacts', authContext.contactsCount);
  const docsByReplicationKey = await authorization.getDocsByReplicationKey(authContext);

  const allowedIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey);
  userCtx.docsCount = allowedIds.length;
  assertWithinLimit(userCtx, 'docs', allowedIds.length);
  const unpurgedIds = await purgedDocs.getUnPurgedIds(userCtx, allowedIds);
  userCtx.unpurgedDocsCount = unpurgedIds.length;
  assertWithinLimit(userCtx, 'unpurged_docs', unpurgedIds.length);

  const excludeTasks = { includeTasks: false };
  const warnIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey, excludeTasks);
  const unpurgedWarnIds = _.intersection(unpurgedIds, warnIds);

  // user could have disconnected
  if (!res?.closed) {
    await replicationLimitLog.put(userCtx.name, unpurgedIds.length, allowedIds.length);
  }

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

const getArchivedDocs = async (docIds) => {
  const result = await db.archive.allDocs({ keys: docIds });
  return result.rows.filter(row => !row.error && !row.value?.deleted).map(row => row.id);
};

const getDocIdsToDelete = async (userCtx, docIds) => {
  if (!docIds.length) {
    return [];
  }

  const allDocs = await db.medic.allDocs({ keys: docIds });
  const toDelete = allDocs.rows
    .filter(row => row.error === 'deleted' || row?.value?.deleted)
    .map(row => row.key);

  const [toPurge, toArchive] = await Promise.all([
    purgedDocs.getPurgedIds(userCtx, docIds, false),
    getArchivedDocs(docIds),
  ]);
  toDelete.push(...toPurge, ...toArchive);

  // a doc can be flagged by more than one source (e.g. deleted after being purged or archived)
  return [...new Set(toDelete)];
};

module.exports = {
  DEFAULT_LIMITS,
  getDocIdsRevPairs,
  getContext,
  getDocIdsToDelete,
};
