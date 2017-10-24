const auth = require('../auth'),
      userDb = require('../lib/user-db');

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

module.exports = (req, callback) => {
  checkPermissions(req, (err, username) => {
    if (err) {
      return callback(err);
    }
    userDb.create(username, callback);
  });
};
