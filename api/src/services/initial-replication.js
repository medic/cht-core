const db = require('../db');
const authorization = require('./authorization');
const purgedDocs = require('./purged-docs');
const _ = require('lodash');
const { DOC_IDS_WARN_LIMIT } = require('../services/replication-limit-log');

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

const getContext = async (userCtx) => {
  const info = await db.medic.info();
  const context = await getDocIds(userCtx);

  return {
    ...context,
    lastSeq: info.update_seq,
  };
};

const getRevs = async (docIds) => {
  const result = await db.medic.allDocs({ keys: docIds });
  return result.rows.map(row => ({ id: row.id, rev: row.value && row.value.rev }));
};

module.exports = {
  getDocIds,
  getRevs,
  getContext,
};
