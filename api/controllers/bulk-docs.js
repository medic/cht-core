const auth = require('../auth');
const bulkDocs = require('../services/bulk-docs');

module.exports = {
  bulkDelete: (req, res, next) => {
    return auth.getUserCtx(req)
      .then(userCtx => {
        if (!auth.isAdmin(userCtx)) {
          const error = Error();
          error.code = 401;
          throw error;
        }
      })
      .then(() => bulkDocs.bulkDelete(req.body.docs, res, { batchSize: 100 }))
      .catch(err => next(err));
  }
};
