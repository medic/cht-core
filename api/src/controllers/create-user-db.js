const auth = require('../auth'),
      serverUtils = require('../server-utils'),
      userDb = require('../services/user-db');

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
    .then(username => {
      userDb.create(username, err => {
        if (err) {
          throw err;
        }
        res.json({ ok: true });
      });
    })
    .catch(err => serverUtils.error(err, req, res));
};
