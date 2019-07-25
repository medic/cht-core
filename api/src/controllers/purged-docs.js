const authorization = require('../services/authorization');
const db = require('../db');
const serverSidePurge = require('../services/server-side-purge-roles');
const serverUtils = require('../server-utils');

module.exports.getPurgedDocs = (req, res) => {
  const opts = {
    checkPointerId: req.replicationId,
    limit: req.query.limit
  };
  return authorization
    .getAuthorizationContext(req.userCtx)
    .then(authContext => authorization.getAllowedDocIds(authContext, { includeTombstones: false }))
    .then(allowedIds => serverSidePurge.getPurgedIdsSince(req.userCtx.roles, allowedIds, opts))
    .then(({ purgedDocIds, lastSeq }) => {
      res.json({ purged_ids: purgedDocIds, last_seq: lastSeq });
    });
};

module.exports.checkpoint = (req, res) => {
  if (!req.replicationId) {
    return serverUtils.error({ code: 400, reason: 'Missing required header medic-replication-id' }, req, res);
  }
  if (!req.query || !req.query.seq) {
    return serverUtils.error({ code: 400, reason: 'Missing required parameter seq' }, req, res);
  }

  return serverSidePurge
    .writeCheckPointer(req.userCtx.roles, req.replicationId, req.query.seq)
    .then(() => res.json({ success: true }));
};
