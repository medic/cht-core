const auth = require('../auth');
const serverUtils = require('../server-utils');
const dbConfigService = require('../services/db-config');

module.exports = {
  getAttachments: (req, res) => {
    auth.getUserCtx(req)
      .then(userCtx => {
        if (auth.isDbAdmin(userCtx)) {
          return dbConfigService.getConfig('attachments');
        }
        throw {
          code: 401,
          message: 'Insufficient privileges'
        };
      })
      .then((config) => res.json(config))
      .catch(err => serverUtils.error(err, req, res));
  }
};
