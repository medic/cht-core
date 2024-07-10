const auth = require('../auth');
const connectedUserLogService = require('../services/connected-user-log');
const logger = require('@medic/logger');

module.exports = {
  log: (req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(({ name }) => connectedUserLogService.save(name))
      .catch(err => {
        if (err && err.code === 401) {
          // don't spam the logs with authentication errors
          return;
        }

        logger.error('Error recording user connection:', err);
      })
      .then(() => next());
  }
};
