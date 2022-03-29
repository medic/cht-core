const _ = require('lodash/core');
const secureSettings = require('@medic/settings');

const serverUtils = require('../server-utils');
const auth = require('../auth');

const checkAuth = req => {
  return auth.getUserCtx(req)
    .then(userCtx => auth.isDbAdmin(userCtx));
};

// TODO unit test
module.exports = {
  put: (req, res) => {
    const key = req.params.key;
    const password = req.body;

    if (!key) {
      return serverUtils.error({ code: 400, reason: 'Missing required param "key"' }, req, res);
    }
    if (_.isEmpty(password)) {
      return serverUtils.error({ code: 400, reason: 'Missing required request body' }, req, res);
    }

    return checkAuth(req)
      .then(() => secureSettings.setCredentials(key, password))
      .then(() => res.json({ ok: true }))
      .catch(err => serverUtils.error(err, req, res));
  }
};
