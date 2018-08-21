const auth = require('../auth'),
      serverUtils = require('../server-utils'),
      userDb = require('../services/user-db');

const checkPermissions = (req, callback) => {
  auth.getUserCtx(req, (err, userCtx) => {
    if (err) {
      return callback(err);
    }
    const username = userCtx.name;
    if (req.url !== '/' + userDb.getDbName(username) + '/') {
      // trying to create a db with a disallowed name
      return callback({ code: 403, message: 'Insufficient privileges' });
    }
    return callback(null, username);
  });
};

module.exports = (req, res) => {
  checkPermissions(req, (err, username) => {
    if (err) {
      return serverUtils.error(err, req, res);
    }
    userDb.create(username, err => {
      if (err) {
        return serverUtils.error(err, req, res);
      }
      res.json({ ok: true });
    });
  });
};
