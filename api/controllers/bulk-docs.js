const auth = require('../auth');
const serverUtils = require('../server-utils');
const bulkDocs = require('../services/bulk-docs');

module.exports = {
  bulkDelete: (req, res, next) => {
    auth.getUserCtx(req, function(err, userCtx) {
      if (err) {
        return serverUtils.error(err, req, res);
      } else if (!auth.isAdmin(userCtx)) {
        return serverUtils.error({ code: 401 }, req, res);
      }

      bulkDocs.bulkDelete(req.body.docs, res, { batchSize: 100 })
        .catch(err => next(err));
    });
  }
};
