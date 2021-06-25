const auth = require('../auth');
const connectedUserLogService = require('../services/connected-user-log');
const logger = require('../logger');

module.exports = {
  log: (req, res, next) => {
    return auth
      .getUserCtx(req)
      .then(({ name }) => connectedUserLogService.save(name))
      .catch(err => {
        logger.error('Error recording user connection:', err);
      })
      .then(() => next());
  }
};
