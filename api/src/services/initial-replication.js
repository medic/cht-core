const db = require('../db');
const authorization = require('./authorization');
const purgedDocs = require('./purged-docs');
const cacheService = require('./cache');
const _ = require('lodash');
const { DOC_IDS_WARN_LIMIT } = require('../services/replication-limit-log');

const CACHE_NAME = 'initial-replication';
const TTL = 60 * 60; // keep cache for 1 hour

const getDocIds = async (userCtx) => {
  const context = await authorization.getAuthorizationContext(userCtx);
  const docsByReplicationKey = await authorization.getDocsByReplicationKey(context);

  const excludeTombstones = { includeTombstones: false };
  const allowedIds = authorization.filterAllowedDocIds(context, docsByReplicationKey, excludeTombstones);
  const unpurgedIds = await purgedDocs.getUnPurgedIds(userCtx.roles, allowedIds);

  const excludeTombstonesAndTasks = { includeTombstones: false, includeTasks: false };
  const warnIds = authorization.filterAllowedDocIds(context, docsByReplicationKey, excludeTombstonesAndTasks);
  const unpurgedWarnIds = _.intersection(unpurgedIds, warnIds);

  return {
    docIds: unpurgedIds,
    warnDocIds: unpurgedWarnIds,
    warn: unpurgedWarnIds.length >= DOC_IDS_WARN_LIMIT,
    limit: DOC_IDS_WARN_LIMIT,
  };
};

const getInitialReplicationContext = async (userCtx, replicationId) => {
  const cache = cacheService.instance(CACHE_NAME, { stdTTL: TTL });
  const cached = cache.get(replicationId);
  if (cached) {
    cache.ttl(replicationId);
    return cached;
  }

  const info = await db.medic.info();
  const { docIds, warn } = await getDocIds(userCtx);

  cache.set(replicationId, { docIds, lastSeq: info.update_seq, warn });
  return cache.get(replicationId);
};

module.exports = {
  getDocIds,
  getInitialReplicationContext,
};
