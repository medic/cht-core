const auth = require('../auth');
const serverUtils = require('../server-utils');
const logDocsService = require('../services/log-docs');

module.exports = {
  getReplicationLimitLog: (req, res) => {
    return auth
      .getUserCtx(req)
      .then(() => logDocsService.getReplicationLimitExceededLog(req.query.user))
      .then(logs => res.json(logs))
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  }
};
