const db = require('../db');
const authorization = require('./authorization');
const purgedDocs = require('./purged-docs');
const cacheService = require('./cache');

const CACHE_NAME = 'initial-replication';

const getAllDocIds = async (userCtx, replicationId) => {
  replicationId = replicationId || userCtx.name;
  const cache = cacheService.instance(CACHE_NAME, { stdTTL: 100 * 60 });
  const cached = cache.get(replicationId);
  if (cached) {
    cache.ttl(replicationId);
    return cached;
  }

  const info = await db.medic.info();
  const context = await authorization.getAuthorizationContext(userCtx);
  const allowedDocIds = await authorization.getAllowedDocIds(context, { includeTombstones: false });
  const unpurgedIds = await purgedDocs.getUnPurgedIds(userCtx.roles, allowedDocIds);

  cache.set(replicationId, {
    docIds: unpurgedIds,
    lastSeq: info.update_seq,
  });

  return cache.get(replicationId);
};

const getDocsIds = async (userCtx, replicationId) => {
  const { docIds, lastSeq } = await getAllDocIds(userCtx, replicationId);

  return {
    doc_ids: docIds,
    last_seq: lastSeq,
  };
};

module.exports = {
  getDocsIds,
};
