const serverUtils = require('../server-utils');
const uiExtensionService = require('../services/ui-extension');

module.exports = {
  list: async (req, res) => {
    try {
      const extensions = await uiExtensionService.getAllProperties();
      res.json(extensions);
    } catch (e) {
      serverUtils.serverError(e, req, res);
    }
  },
  
  get: async (req, res) => {
    const id = req.params.id;
    if (!id) {
      return serverUtils.error({ status: 400, message: 'Extension id parameter required' }, req, res);
    }
    
    try {
      const script = await uiExtensionService.getScript(id);
      if (script?.data) {
        res.set('Content-Type', 'text/javascript');
        res.send(Buffer.from(script.data, 'base64'));
      } else {
        serverUtils.error({ message: 'Not found', status: 404 }, req, res);
      }
    } catch (e) {
      serverUtils.serverError(e, req, res);
    }
  }
};
