const auth = require('../auth');
const serverUtils = require('../server-utils');
const replicationLimitLog = require('../services/replication-limit-log');

module.exports = {
  get: (req, res) => {
    return auth
      .getUserCtx(req)
      .then((userCtx) => {
        if (!auth.isDbAdmin(userCtx)) {
          throw {
            code: 401,
            message: 'User is not an admin'
          };
        }

        return replicationLimitLog.get(req.query.user);
      })
      .then(logs => res.json(logs))
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  }
};
