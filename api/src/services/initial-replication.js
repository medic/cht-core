const db = require('../db');
const authorization = require('./authorization');
const purgedDocs = require('./purged-docs');
const _ = require('lodash');
const { DOC_IDS_WARN_LIMIT } = require('../services/replication-limit-log');

const getContext = async (userCtx) => {
  const info = await db.medic.info();
  const authContext = await authorization.getAuthorizationContext(userCtx);
  const docsByReplicationKey = await authorization.getDocsByReplicationKey(authContext);

  const excludeTombstones = { includeTombstones: false };
  const allowedIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey, excludeTombstones);
  const unpurgedIds = await purgedDocs.getUnPurgedIds(userCtx.roles, allowedIds);

  const excludeTombstonesAndTasks = { includeTombstones: false, includeTasks: false };
  const warnIds = authorization.filterAllowedDocIds(authContext, docsByReplicationKey, excludeTombstonesAndTasks);
  const unpurgedWarnIds = _.intersection(unpurgedIds, warnIds);

  return {
    docIds: unpurgedIds,
    warnDocIds: unpurgedWarnIds,
    warn: unpurgedWarnIds.length >= DOC_IDS_WARN_LIMIT,
    limit: DOC_IDS_WARN_LIMIT,
    lastSeq: info.update_seq,
  };
};

const getDocIdsRevPairs = async (docIds) => {
  const result = await db.medic.allDocs({ keys: docIds });
  return result.rows
    .filter(row => row.value && row.value.rev)
    .map(row => ({ id: row.id, rev: row.value.rev }));
};

module.exports = {
  getDocIdsRevPairs,
  getContext,
};
