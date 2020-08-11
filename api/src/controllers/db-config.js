const auth = require('../auth');
const serverUtils = require('../server-utils');
const dbConfigService = require('../services/db-config');

module.exports = {
  getAttachments: (req, res) => {
    auth.getUserCtx(req)
      .then(async userCtx => {
        if (auth.isDbAdmin(userCtx)) {
          const config = await dbConfigService.getConfig('attachments');
          return res.json(config.data);
        }
      })
      .catch(err => serverUtils.error(err, req, res));
  }
};
