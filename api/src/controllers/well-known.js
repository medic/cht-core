const settingsService = require('../services/settings');
const serverUtils = require('../server-utils');

module.exports = {
  assetlinks: async (req, res) => {
    return settingsService.get()
      .then((settings) => {
        if (!settings.assetlinks) {
          throw { code: 404, error: 'not_found', reason: 'No assetlinks.json configured' };
        }

        return res.json(settings.assetlinks);
      })
      .catch(error => serverUtils.error(error, req, res));
  },
};
