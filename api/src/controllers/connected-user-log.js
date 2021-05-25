const auth = require('../auth');
const serverUtils = require('../server-utils');
const connectedUserLogService = require('../services/connected-user-log');

module.exports = {
  log: (req) => {
    return auth
      .getUserCtx(req)
      .then((userCtx) => {
        const log = {
          user: userCtx.name,
          timestamp: new Date().getTime()
        };
        connectedUserLogService.save(log);
      });
  },
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

        let interval = 7; // default to 7 days
        if (req.query && req.query.interval) {
          interval = req.query.interval;
        } 
        return connectedUserLogService
          .get(interval);
      })
      .then((logs) => {
        return res.json(logs);
      })
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  }
};
