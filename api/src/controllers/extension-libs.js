const serverUtils = require('../server-utils');
const extensionLibs = require('../services/extension-libs');

module.exports = {
  list: async (req, res) => {
    try {
      const libs = await extensionLibs.getAll();
      res.json(libs.map(lib => lib.name));
    } catch(e) {
      serverUtils.serverError(e, req, res);
    }
  },
  get: async (req, res) => {
    const name = req.params.name;
    if (!name) {
      return serverUtils.error({ status: 400, message: 'Library name parameter required' }, req, res);
    }
    try {
      const lib = await extensionLibs.get(req.params.name);
      if (lib && lib.data) {
        res.set('Content-Type', lib.contentType);
        res.send(Buffer.from(lib.data, 'base64'));
      } else {
        serverUtils.error({ message: 'Not found', status: 404 }, req, res);
      }
    } catch(e) {
      serverUtils.serverError(e, req, res);
    }
  }
};
