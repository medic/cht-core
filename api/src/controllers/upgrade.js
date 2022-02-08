const auth = require('../auth');
const serverUtils = require('../server-utils');

const service = require('../services/setup/upgrade');
const configWatcher = require('../services/config-watcher');

const REQUIRED_PERMISSIONS = ['can_configure'];
const checkAuth = (req) => auth.check(req, REQUIRED_PERMISSIONS);

const upgradeV1 = (req, res, stageOnly) => {
  const buildInfo = req.body.build;
  if (!buildInfo) {
    throw {
      message: 'You must provide a build info body',
      status: 400
    };
  }

  req.body.version = buildInfo.version;
  return upgrade(req, res, stageOnly);
};

const upgrade = (req, res, stageOnly) => {
  return checkAuth(req)
    .then(userCtx => {
      const version = req.body.version;
      if (!version) {
        throw {
          message: 'You must provide a version',
          status: 400
        };
      }

      return service.upgrade(version, userCtx.user, stageOnly);
    })
    .then(() => res.json({ ok: true }))
    .catch(err => serverUtils.error(err, req, res));
};

const completeUpgrade = (req, res) => {
  return checkAuth(req)
    .then(() => service.complete().then(() => res.json({ ok: true })))
    .catch(err => serverUtils.error(err, req, res));
};

const upgradeInProgress = (req, res) => {
  return checkAuth(req)
    .then(() => Promise.all([
      service.upgradeInProgress(),
      service.indexerProgress(),
    ]))
    .then(([upgradeDoc, indexers]) => {
      res.json({ upgradeDoc, indexers });
    })
    .catch(err => serverUtils.error(err, req, res));
};

const abortUpgrade = (req, res) => {
  return checkAuth(req)
    .then(() => service.abort())
    .then(() => res.json({ ok: true }))
    .catch(err => serverUtils.error(err, req, res));
};

module.exports = {
  upgradeV1: (req, res) => upgradeV1(req, res, false),
  stageV1: (req, res) => upgradeV1(req, res, true),

  upgrade: (req, res) => upgrade(req, res, false),
  stage: (req, res) => upgrade(req, res, true),
  complete: completeUpgrade,
  upgradeInProgress: upgradeInProgress,
  abort: abortUpgrade,
  serviceWorker: (req, res) => {
    return checkAuth(req)
      .then(() => configWatcher.updateServiceWorker())
      .then(() => res.json({ ok: true }))
      .catch(err => serverUtils.error(err, req, res));
  },
};
