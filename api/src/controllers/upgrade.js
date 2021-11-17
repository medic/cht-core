const auth = require('../auth');
const serverUtils = require('../server-utils');

const service = require('../services/horti/upgrade');

const REQUIRED_PERMISSIONS = ['can_configure'];

const upgrade = (req, res, stageOnly) => {
  return auth
    .check(req, REQUIRED_PERMISSIONS)
    .then(userCtx => {
      const buildInfo = req.body.build;
      if (!buildInfo) {
        throw {
          message: 'You must provide a build info body',
          status: 400
        };
      }

      return service.upgrade(req.body.build, userCtx.user, stageOnly);
    })
    .then(() => res.json({ ok: true }))
    .catch(err => serverUtils.error(err, req, res));
};

const completeUpgrade = (req, res) => {
  return auth
    .check(req, REQUIRED_PERMISSIONS)
    .then(() => service.complete().then(() => res.json({ ok: true })))
    .catch(err => serverUtils.error(err, req, res));
};

module.exports = {
  upgrade: (req, res) => upgrade(req, res, false),
  stage: (req, res) => upgrade(req, res, true),
  complete: (req, res) => completeUpgrade(req, res),
};
