const auth = require('../auth');
const serverUtils = require('../server-utils');
const userDb = require('../services/user-db');

const checkPermissions = req => {
  return auth.getUserCtx(req).then(userCtx => {
    const username = userCtx.name;
    if (req.url !== '/' + userDb.getDbName(username) + '/') {
      // trying to create a db with a disallowed name
      throw { code: 403, message: 'Insufficient privileges' };
    }
    return username;
  });
};

module.exports = (req, res) => {
  return checkPermissions(req)
    .then(username => userDb.create(username))
    .then(() => res.json({ ok: true }))
    .catch(err => serverUtils.error(err, req, res));
};
