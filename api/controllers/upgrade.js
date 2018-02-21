const upgrade = require('../services/upgrade'),
      serverUtils = require('../server-utils');

module.exports = {
  routed: ({res, req, userCtx}) => {
    var buildInfo = req.body.build;
      if (!buildInfo) {
        return serverUtils.error({
          message: 'You must provide a build info body',
          status: 400
        }, req, res);
      }

      return upgrade(req.body.build, userCtx.user)
        .then(() => res.json({ ok: true }));
  }
};
