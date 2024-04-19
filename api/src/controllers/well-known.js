const settingsService = require('../services/settings');
const serverUtils = require('../server-utils');

module.exports = {
  assetlinks: async (req, res) => {
    const settings = await settingsService.get();
    if (Object.hasOwn(settings, 'assetlinks')) {
      return res.json(settings.assetlinks);
    }

    serverUtils.error({ code: 404, error: 'not_found', reason: 'No assetlinks.json configured' }, req, res);
  },
};
