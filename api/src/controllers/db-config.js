/* eslint-disable no-console */
const auth = require('../auth');
const serverUtils = require('../server-utils');
const dbConfigService = require('../services/db-config');

module.exports = {
  get: (req, res) => {
    auth.getUserCtx(req)
      .then(async userCtx => {
        if (auth.isDbAdmin(userCtx)) {
          console.log('query here');
          console.log(`returning ${dbConfigService.getConfig()}`);
          // return dbConfigService.getConfig().then((result) => {
          //   res.json(result);
          // });
          return await dbConfigService.getConfig();
        }
      })
      .catch(err => serverUtils.error(err, req, res));
  }
};
