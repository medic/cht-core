const authorization = require('../services/authorization');
const purgedDocs = require('../services/purged-docs');
const serverUtils = require('../server-utils');

module.exports.getPurgedDocs = (req, res) => {
  const opts = {
    checkPointerId: req.replicationId,
    limit: req.query && req.query.limit
  };
  return authorization
    .getAuthorizationContext(req.userCtx)
    .then(authContext => authorization.getAllowedDocIds(authContext, { includeTombstones: false }))
    .then(allowedIds => purgedDocs.getPurgedIdsSince(req.userCtx.roles, allowedIds, opts))
    .then(({ purgedDocIds, lastSeq }) => {
      res.json({ purged_ids: purgedDocIds, last_seq: lastSeq });
    })
    .catch(err => serverUtils.error(err, req, res));
};

module.exports.checkpoint = (req, res) => {
  if (!req.replicationId) {
    return serverUtils.error({ code: 400, reason: 'Missing required header medic-replication-id' }, req, res);
  }
  if (!req.query || !req.query.seq) {
    return serverUtils.error({ code: 400, reason: 'Missing required parameter seq' }, req, res);
  }

  return purgedDocs
    .writeCheckPointer(req.userCtx.roles, req.replicationId, req.query.seq)
    .then(() => res.json({ success: true }))
    .catch(err => serverUtils.error(err, req, res));
};

module.exports.info = (req, res) => {
  return purgedDocs
    .info(req.userCtx.roles)
    .then(info => res.json(info))
    .catch(err => serverUtils.error(err, req, res));
};
