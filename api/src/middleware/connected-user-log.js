const auth = require('../auth');
const connectedUserLogService = require('../services/connected-user-log');

module.exports = {
  log: (req, res, next) => {
    return auth
      .getUserCtx(req)
      .then((userCtx) => {
        const log = {
          user: userCtx.name,
          timestamp: new Date().getTime()
        };
        connectedUserLogService.save(log);
      })
      .then(next);
  }
};
