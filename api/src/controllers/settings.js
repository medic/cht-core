const auth = require('../auth');
const serverUtils = require('../server-utils');
const settingsService = require('../services/settings');
const objectPath = require('object-path');

const doGet = req => auth.getUserCtx(req).then(() => settingsService.get());

module.exports = {
  get: (req, res) => {
    return doGet(req, res)
      .then(settings => res.json(settings))
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  },
  getDeprecatedTransitions: (req, res) => {
    return auth
      .getUserCtx(req)
      .then(() => settingsService.getDeprecatedTransitions())
      .then(transitions => res.json(transitions))
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  },
  // deprecated - used by medic-conf, medic-reporter, etc
  getV0: (req, res) => {
    return doGet(req, res)
      .then(settings => {
        if (req.params.path) {
          settings = objectPath.get(settings, req.params.path) || {};
        }
        res.json({
          settings: settings,
          meta: {},
          schema: {}
        });
      })
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  },
  put: (req, res) => {
    return auth
      .check(req, ['can_edit', 'can_configure'])
      .then(() => {
        const replace = req.query && req.query.replace;
        const overwrite = req.query && req.query.overwrite;
        return settingsService.update(req.body, replace, overwrite);
      })
      .then(result => {
        res.json({ success: true, updated: !!result });
      })
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  }
};
