const settingsService = require('../services/settings');
const serverUtils = require('../server-utils');

module.exports = {
  assetlinks: async (req, res) => {
    try {
      const settings = await settingsService.get();
      if (settings.assetlinks) {
        return res.json(settings.assetlinks);
      }

      serverUtils.error({ code: 404, reason: 'No assetlinks.json configured' }, req, res);
    } catch (error) {
      serverUtils.error(error, req, res);
    }
  },
};
