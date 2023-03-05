const serverUtils = require('../server-utils');
const extensionLibs = require('../services/extension-libs');

module.exports = {
  get: async (req, res) => {
    const lib = await extensionLibs.get(req.params.name);
    if (lib && lib.data) {
      res.set('Content-Type', lib.contentType);
      res.send(Buffer.from(lib.data, 'base64'));
    } else {
      serverUtils.error({ message: 'Not found', status: 404 }, req, res);
    }
  }
};
