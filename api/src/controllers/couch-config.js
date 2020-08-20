const auth = require('../auth');
const serverUtils = require('../server-utils');
const secureSettings = require('@medic/settings');

module.exports = {
  getAttachments: (req, res) => {
    return auth
      .getUserCtx(req)
      .then(userCtx => {
        if (!auth.isDbAdmin(userCtx)) {
          throw {
            code: 401,
            message: 'Insufficient privileges'
          };
        }
        return secureSettings.getCouchConfig('attachments');
      })
      .then((config) => res.json(config))
      .catch(err => serverUtils.error(err, req, res));
  }
};
