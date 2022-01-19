const auth = require('../auth');
const serverUtils = require('../server-utils');

const service = require('../services/setup/upgrade');
const configWatcher = require('../services/config-watcher');

const REQUIRED_PERMISSIONS = ['can_configure'];
const checkAuth = (req) => auth.check(req, REQUIRED_PERMISSIONS);

const upgrade = (req, res, stageOnly) => {
  return checkAuth(req)
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
  return checkAuth(req)
    .then(() => service.complete().then(() => res.json({ ok: true })))
    .catch(err => serverUtils.error(err, req, res));
};

const progress = (req, res) => {
  return checkAuth(req)
    .then(() => service.progress())
    .then(indexers => res.json(indexers));
};

module.exports = {
  upgrade: (req, res) => upgrade(req, res, false),
  stage: (req, res) => upgrade(req, res, true),
  complete: completeUpgrade,
  progress: progress,
  serviceWorker: (req, res) => {
    return checkAuth(req)
      .then(() => configWatcher.updateServiceWorker())
      .then(() => res.json({ ok: true }))
      .catch(err => serverUtils.error(err, req, res));
  },
};
