const auth = require('../auth'),
      serverUtils = require('../server-utils');

const service = require('../services/upgrade');

module.exports = {
  upgrade: (req, res) => {
    return auth.check(req, '_admin')
      .then(userCtx => {
        var buildInfo = req.body.build;
        if (!buildInfo) {
          throw {
            message: 'You must provide a build info body',
            status: 400
          };
        }

        return service.upgrade(req.body.build, userCtx.user)
          .then(() => res.json({ ok: true }));
      })
      .catch(err => serverUtils.error(err, req, res));
  }
};
