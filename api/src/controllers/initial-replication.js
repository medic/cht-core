const authorization = require('../services/authorization');
const auth = require('../auth');
const serverUtils = require('../server-utils');

const DOC_IDS_WARN_LIMIT = 10000;


const getAllowedDocIds = userCtx => {
  return authorization
    .getAuthorizationContext(userCtx)
    .then(ctx => authorization.getAllowedDocIds(ctx, { includeTombstones: false, limit: DOC_IDS_WARN_LIMIT * 2 }));
};

module.exports.info = (req, res) => {
  let userCtx;
  if (auth.isOnlineOnly(req.userCtx)) {
    if (!req.query.role || !req.query.facility_id) {
      return serverUtils.error({ code: 400, reason: 'Missing required query params: role and/or facility_id' }, req, res);
    }

    if (!auth.isOffline([ req.query.role ])) {
      return serverUtils.error({ code: 400, reason: 'Provided role is not offline' }, req, res);
    }

    userCtx = {
      roles: [ req.query.role ],
      facility_id: req.query.facility_id,
      contact_id: req.query.contact_id
    };
  } else {
    userCtx = req.userCtx;
  }

  return getAllowedDocIds(userCtx).then(docIds => res.json({
    total_docs: docIds.length,
    warn: docIds.length >= DOC_IDS_WARN_LIMIT
  }));
};
