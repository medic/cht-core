const auth = require('../auth');
const bulkDocs = require('../services/bulk-docs');

module.exports = {
  bulkDelete: (req, res, next) => {
    return auth.getUserCtx(req)
      .then(userCtx => {
        if (!auth.isAdmin(userCtx)) {
          throw {
            code: 401,
            message: 'User is not an admin'
          };
        }
      })
      .then(() => bulkDocs.bulkDelete(req.body.docs, res, { batchSize: 100 }))
      .catch(err => next(err));
  }
};
