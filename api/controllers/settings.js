const auth = require('../auth'),
      serverUtils = require('../server-utils'),
      settingsService = require('../services/settings');

const doGet = (req, res, includeSchema) => {
  auth.getUserCtx(req) // make sure they're logged in
    .then(() => settingsService.get({ includeSchema: includeSchema }))
    .then(settings => res.json(settings))
    .catch(err => {
      serverUtils.error(err, req, res, true);
    });
};

module.exports = {
  get: (req, res) => {
    doGet(req, res);
  },
  // deprecated
  getIncludingSchema: (req, res) => {
    doGet(req, res, true);
  },
  put: (req, res) => {
    auth.getUserCtx(req)
      .then(userCtx => {
        if (!auth.isAdmin(userCtx)) {
          throw {
            code: 401,
            message: 'User is not an admin'
          };
        }
      })
      .then(() => {
        return settingsService.update({
          body: req.body,
          replace: req.query && req.query.replace
        });
      })
      .then(() => {
        res.json({ success: true });
      })
      .catch(err => {
        serverUtils.error(err, req, res, true);
      });
  }
};
