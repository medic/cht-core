const auth = require('../auth'),
      serverUtils = require('../server-utils');

const service = require('../services/upgrade');

const upgrade = (req, res, stageOnly) => {
  return auth.check(req, 'can_configure')
    .then(userCtx => {
      var buildInfo = req.body.build;
      if (!buildInfo) {
        throw {
          message: 'You must provide a build info body',
          status: 400
        };
      }

      return service.upgrade(req.body.build, userCtx.user, {stageOnly: stageOnly})
        .then(() => res.json({ ok: true }));
    })
    .catch(err => serverUtils.error(err, req, res));
};

module.exports = {
  upgrade: (req, res) => upgrade(req, res, false),
  stage: (req, res) => upgrade(req, res, true),
  complete: (req, res) => {
    return auth.check(req, 'can_configure')
      .then(() => {
        return service.complete()
          .then(() => res.json({ ok: true }));
      })
      .catch(err => serverUtils.error(err, req, res));
  }
};
